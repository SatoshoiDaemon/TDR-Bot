import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { prisma } from '@database/client.js';
import { redis } from '@database/redis.js';
import { logger } from '@shared/logger.js';
import { aiConfig } from '@shared/config/yamlLoader.js';
import { KeyManagerService, APIKeyData } from './keyManagerService.js';

interface AIMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface UserContext {
  userId: string;
  username: string;
  shortTermMemory: AIMessage[];
  mediumTermSummary?: string;
  longTermProfile?: any;
}

export class AIService {
  private currentKey: APIKeyData | null = null;
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    // Inicialização adiada para processMessage para permitir seleção de chave
  }

  private async ensureModelInitialized() {
    const keyData = await KeyManagerService.getBestKey();

    if (!keyData) {
      throw new Error('Nenhuma chave API disponível');
    }

    // Se a chave mudou ou o modelo não foi inicializado
    if (!this.model || this.currentKey?.key !== keyData.key) {
      this.currentKey = keyData;
      this.genAI = new GoogleGenerativeAI(keyData.key);

      const functions = this.getFunctionDeclarations();

      this.model = this.genAI.getGenerativeModel({
        model: aiConfig.ai.model,
        generationConfig: {
          temperature: aiConfig.ai.temperature,
          maxOutputTokens: aiConfig.ai.max_tokens,
        },
        tools: aiConfig.functions.enabled ? [{ functionDeclarations: functions }] as any : undefined,
        systemInstruction: this.buildSystemPrompt(),
      });

      logger.info(`Modelo IA inicializado com a chave: ${keyData.id}`);
    }
  }

  private buildSystemPrompt(): string {
    return `${aiConfig.prompt.system}\n\n${aiConfig.prompt.server_context}`;
  }

  // ============================================
  // SEGURANÇA E SANITIZAÇÃO
  // ============================================

  sanitizeInput(input: string): string {
    if (!aiConfig.security.sanitize_input) return input;

    let sanitized = input.trim();

    // Limitar tamanho
    if (sanitized.length > aiConfig.security.max_input_length) {
      sanitized = sanitized.substring(0, aiConfig.security.max_input_length);
    }

    // Remover menções não autorizadas (exceto a do bot)
    if (aiConfig.security.strip_mentions) {
      sanitized = sanitized.replace(/<@!?\d+>/g, '[menção]');
    }

    // Normalizar espaços
    sanitized = sanitized.replace(/\s+/g, ' ');

    return sanitized;
  }

  detectPromptInjection(input: string): { isInjection: boolean; reason?: string } {
    const lowerInput = input.toLowerCase();

    // Verificar padrões bloqueados
    for (const pattern of aiConfig.security.blocked_patterns) {
      if (lowerInput.includes(pattern.toLowerCase())) {
        logger.warn(`Tentativa de injeção detectada: "${pattern}" em "${input.substring(0, 50)}..."`);

        // Registrar métrica
        this.recordInjectionAttempt();

        return {
          isInjection: true,
          reason: `Padrão bloqueado detectado: "${pattern}"`,
        };
      }
    }

    // Verificar palavras suspeitas
    for (const keyword of aiConfig.security.suspicious_keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        logger.warn(`Palavra suspeita detectada: "${keyword}" em "${input.substring(0, 50)}..."`);
      }
    }

    // Detectar tentativas de extrair o prompt do sistema
    if (aiConfig.security.block_prompt_extraction) {
      const extractionPatterns = [
        /what (is|are) your (instructions|prompt|system prompt)/i,
        /show me your (instructions|prompt|rules)/i,
        /repeat your (instructions|prompt)/i,
        /quais são suas (instruções|regras)/i,
        /mostre suas (instruções|regras)/i,
      ];

      for (const pattern of extractionPatterns) {
        if (pattern.test(input)) {
          logger.warn(`Tentativa de extração de prompt: "${input.substring(0, 50)}..."`);
          return {
            isInjection: true,
            reason: 'Tentativa de extração de prompt do sistema',
          };
        }
      }
    }

    return { isInjection: false };
  }

  private async recordInjectionAttempt() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingMetric = await prisma.aIMetrics.findFirst({
        where: { date: today }
      });

      if (existingMetric) {
        await prisma.aIMetrics.update({
          where: { id: existingMetric.id },
          data: { injectionAttempts: { increment: 1 } }
        });
      } else {
        await prisma.aIMetrics.create({
          data: { date: today, injectionAttempts: 1 }
        });
      }
    } catch (error) {
      logger.error('Erro ao registrar tentativa de injeção:', error);
    }
  }

  // ============================================
  // RATE LIMITING
  // ============================================

  async checkRateLimit(userId: string): Promise<{ allowed: boolean; resetIn?: number }> {
    if (!aiConfig.rate_limit.enabled) return { allowed: true };

    try {
      const rateLimit = await prisma.aIRateLimit.findUnique({ where: { userId } });
      const now = new Date();

      if (!rateLimit) {
        // Primeira requisição
        await prisma.aIRateLimit.create({
          data: { userId, requestCount: 1, windowStart: now, lastRequest: now },
        });
        return { allowed: true };
      }

      // Verificar se a janela expirou
      const windowMs = aiConfig.rate_limit.window_minutes * 60 * 1000;
      const windowExpired = now.getTime() - rateLimit.windowStart.getTime() > windowMs;

      if (windowExpired) {
        // Resetar janela
        await prisma.aIRateLimit.update({
          where: { userId },
          data: { requestCount: 1, windowStart: now, lastRequest: now },
        });
        return { allowed: true };
      }

      // Verificar cooldown
      const cooldownMs = aiConfig.rate_limit.cooldown_seconds * 1000;
      const timeSinceLastRequest = now.getTime() - rateLimit.lastRequest.getTime();

      if (timeSinceLastRequest < cooldownMs) {
        return {
          allowed: false,
          resetIn: Math.ceil((cooldownMs - timeSinceLastRequest) / 1000),
        };
      }

      // Verificar limite de requisições
      if (rateLimit.requestCount >= aiConfig.rate_limit.max_requests_per_user) {
        const resetIn = Math.ceil((windowMs - (now.getTime() - rateLimit.windowStart.getTime())) / 1000 / 60);
        return { allowed: false, resetIn };
      }

      // Incrementar contador
      await prisma.aIRateLimit.update({
        where: { userId },
        data: { requestCount: { increment: 1 }, lastRequest: now },
      });

      return { allowed: true };
    } catch (error) {
      logger.error('Erro ao verificar rate limit:', error);
      return { allowed: true }; // Permitir em caso de erro
    }
  }

  // ============================================
  // SISTEMA DE MEMÓRIA
  // ============================================

  async getShortTermMemory(userId: string): Promise<AIMessage[]> {
    if (!aiConfig.memory.short_term.enabled) return [];

    try {
      const key = `ai:memory:short:${userId}`;
      const cached = await redis.get(key);

      if (cached) {
        return JSON.parse(cached);
      }

      return [];
    } catch (error) {
      logger.error('Erro ao buscar memória de curto prazo:', error);
      return [];
    }
  }

  async saveShortTermMemory(userId: string, messages: AIMessage[]) {
    if (!aiConfig.memory.short_term.enabled) return;

    try {
      const key = `ai:memory:short:${userId}`;
      const maxMessages = aiConfig.memory.short_term.max_messages;
      const ttl = aiConfig.memory.short_term.ttl_minutes * 60;

      // Manter apenas as últimas N mensagens
      const trimmed = messages.slice(-maxMessages);

      await redis.setex(key, ttl, JSON.stringify(trimmed));
    } catch (error) {
      logger.error('Erro ao salvar memória de curto prazo:', error);
    }
  }

  async getMediumTermMemory(userId: string): Promise<string | null> {
    if (!aiConfig.memory.medium_term.enabled) return null;

    try {
      const key = `ai:memory:medium:${userId}`;
      return await redis.get(key);
    } catch (error) {
      logger.error('Erro ao buscar memória de médio prazo:', error);
      return null;
    }
  }

  async saveMediumTermMemory(userId: string, summary: string) {
    if (!aiConfig.memory.medium_term.enabled) return;

    try {
      const key = `ai:memory:medium:${userId}`;
      const ttl = aiConfig.memory.medium_term.ttl_hours * 3600;

      await redis.setex(key, ttl, summary);
    } catch (error) {
      logger.error('Erro ao salvar memória de médio prazo:', error);
    }
  }

  async getLongTermMemory(userId: string): Promise<any> {
    if (!aiConfig.memory.long_term.enabled) return null;

    try {
      const memory = await prisma.aIMemory.findUnique({ where: { userId } });
      return memory?.longTerm || null;
    } catch (error) {
      logger.error('Erro ao buscar memória de longo prazo:', error);
      return null;
    }
  }

  async saveLongTermMemory(userId: string, data: any) {
    if (!aiConfig.memory.long_term.enabled) return;

    try {
      await prisma.aIMemory.upsert({
        where: { userId },
        update: { longTerm: data },
        create: { userId, longTerm: data },
      });
    } catch (error) {
      logger.error('Erro ao salvar memória de longo prazo:', error);
    }
  }

  // ============================================
  // PERFIL DE USUÁRIO
  // ============================================

  async getUserProfile(userId: string) {
    if (!aiConfig.user_profiling.enabled) return null;

    try {
      let profile = await prisma.userProfile.findUnique({ where: { id: userId } });

      if (!profile) {
        profile = await prisma.userProfile.create({
          data: {
            id: userId,
            interests: [],
            commonQuestions: [],
          },
        });
      }

      return profile;
    } catch (error) {
      logger.error('Erro ao buscar perfil de usuário:', error);
      return null;
    }
  }

  async updateUserProfile(userId: string, updates: any) {
    if (!aiConfig.user_profiling.enabled || !aiConfig.user_profiling.auto_update) return;

    try {
      await prisma.userProfile.update({
        where: { id: userId },
        data: {
          ...updates,
          totalInteractions: { increment: 1 },
          lastInteraction: new Date(),
        },
      });
    } catch (error) {
      logger.error('Erro ao atualizar perfil de usuário:', error);
    }
  }

  private async detectInterests(message: string): Promise<string[]> {
    const interests: string[] = [];
    const categories = aiConfig.user_profiling.interests_categories;

    const keywords: Record<string, string[]> = {
      economia: ['dracmas', 'carteira', 'banco', 'loja', 'comprar', 'vender', 'economia'],
      leveling: ['nível', 'level', 'xp', 'experiência', 'rank', 'ranking'],
      roleplay: ['roleplay', 'rp', 'personagem', 'história', 'narrativa', 'dado', 'roll'],
      eventos: ['evento', 'clima', 'chuva de dracmas', 'zona quente'],
      jogos: ['blackjack', 'roulette', 'mines', 'apostar', 'jogo'],
      administração: ['admin', 'gerenciar', 'configurar', 'permissão'],
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (categories.includes(category)) {
        for (const word of words) {
          if (message.toLowerCase().includes(word)) {
            interests.push(category);
            break;
          }
        }
      }
    }

    return [...new Set(interests)];
  }

  // ============================================
  // FUNCTION CALLING
  // ============================================

  private getFunctionDeclarations() {
    if (!aiConfig.functions.enabled) return [];

    const functions = [];

    for (const func of aiConfig.functions.available_functions) {
      if (!func.enabled) continue;

      switch (func.name) {
        case 'query_system_knowledge':
          functions.push({
            name: 'query_system_knowledge',
            description: 'Busca informações sobre sistemas, mecânicas e regras do servidor TDR',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                query: {
                  type: SchemaType.STRING,
                  description: 'Termo de busca ou pergunta sobre o sistema',
                },
                category: {
                  type: SchemaType.STRING,
                  description: 'Categoria opcional: economia, leveling, roleplay, eventos, etc',
                },
              },
              required: ['query'],
            },
          });
          break;

        case 'get_user_economy':
          functions.push({
            name: 'get_user_economy',
            description: 'Obtém informações econômicas do usuário (carteira e banco)',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                userId: {
                  type: SchemaType.STRING,
                  description: 'ID do usuário do Discord',
                },
              },
              required: ['userId'],
            },
          });
          break;

        case 'get_user_level':
          functions.push({
            name: 'get_user_level',
            description: 'Obtém nível e XP do usuário',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                userId: {
                  type: SchemaType.STRING,
                  description: 'ID do usuário do Discord',
                },
              },
              required: ['userId'],
            },
          });
          break;

        case 'get_user_inventory':
          functions.push({
            name: 'get_user_inventory',
            description: 'Obtém o inventário do usuário',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                userId: {
                  type: SchemaType.STRING,
                  description: 'ID do usuário do Discord',
                },
              },
              required: ['userId'],
            },
          });
          break;

        case 'search_shop_items':
          functions.push({
            name: 'search_shop_items',
            description: 'Busca itens disponíveis na loja do servidor',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                query: {
                  type: SchemaType.STRING,
                  description: 'Termo de busca (nome ou descrição do item)',
                },
              },
              required: [],
            },
          });
          break;

        case 'get_server_events':
          functions.push({
            name: 'get_server_events',
            description: 'Obtém eventos ativos no servidor',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {},
              required: [],
            },
          });
          break;

        case 'get_leaderboard':
          functions.push({
            name: 'get_leaderboard',
            description: 'Consulta o ranking do servidor',
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                type: {
                  type: SchemaType.STRING,
                  description: 'Tipo de ranking: xp, money, bank, wallet',
                  enum: ['xp', 'money', 'bank', 'wallet'],
                },
                limit: {
                  type: SchemaType.NUMBER,
                  description: 'Número de posições a retornar (padrão: 10)',
                },
              },
              required: ['type'],
            },
          });
          break;
      }
    }

    return functions;
  }

  private async executeFunctionCall(functionName: string, args: any): Promise<any> {
    logger.info(`Executando function call: ${functionName}`, args);

    try {
      switch (functionName) {
        case 'query_system_knowledge':
          return await this.querySystemKnowledge(args.query, args.category);

        case 'get_user_economy':
          return await this.getUserEconomy(args.userId);

        case 'get_user_level':
          return await this.getUserLevel(args.userId);

        case 'get_user_inventory':
          return await this.getUserInventory(args.userId);

        case 'search_shop_items':
          return await this.searchShopItems(args.query);

        case 'get_server_events':
          return await this.getServerEvents();

        case 'get_leaderboard':
          return await this.getLeaderboard(args.type, args.limit || 10);

        default:
          return { error: 'Função não implementada' };
      }
    } catch (error) {
      logger.error(`Erro ao executar ${functionName}:`, error);
      return { error: 'Erro ao executar função' };
    }
  }

  // Implementações das funções
  private async querySystemKnowledge(query: string, category?: string) {
    // Quebrar query em palavras (termos de busca) para "fuzzy match" simples
    const terms = query.split(/\s+/).filter(t => t.length > 3).map(t => t.toLowerCase());

    // Se não sobrar termos úteis, usa a query original
    const searchTerms = terms.length > 0 ? terms : [query.toLowerCase()];

    const where: any = {
      OR: [
        // Busca exata ainda é válida e prioritária (via score, se fosse search full text, mas aqui é OR simples)
        { title: { contains: query, mode: 'insensitive' as any } },
        { content: { contains: query, mode: 'insensitive' as any } },
        // Busca por palavras-chave nos campos
        ...searchTerms.map(term => ({ title: { contains: term, mode: 'insensitive' as any } })),
        ...searchTerms.map(term => ({ content: { contains: term, mode: 'insensitive' as any } })),
        ...searchTerms.map(term => ({ keywords: { has: term } })),
      ],
    };

    if (category) {
      where.category = category;
    }

    const results = await prisma.systemKnowledge.findMany({
      where,
      take: 5,
    });

    logger.info(`Busca por "${query}" retornou ${results.length} resultados.`);
    return results.length > 0 ? { results } : { message: 'Nenhuma informação encontrada' };
  }

  private async getUserEconomy(userId: string) {
    const economy = await prisma.economy.findUnique({ where: { userId } });

    if (!economy) {
      return { wallet: 0, bank: 0, message: 'Usuário não possui dados econômicos' };
    }

    return {
      wallet: Number(economy.wallet),
      bank: Number(economy.bank),
      total: Number(economy.wallet + economy.bank),
    };
  }

  private async getUserLevel(userId: string) {
    const level = await prisma.level.findUnique({ where: { userId } });

    if (!level) {
      return { level: 0, xp: 0, message: 'Usuário não possui dados de leveling' };
    }

    return {
      level: level.level,
      xp: level.xp,
    };
  }

  private async getUserInventory(userId: string) {
    const inventory = await prisma.inventory.findMany({
      where: { userId },
      include: { item: true },
    });

    if (inventory.length === 0) {
      return { message: 'Inventário vazio' };
    }

    return {
      inventory: inventory.map((inv: any) => ({
        name: inv.item.name,
        quantity: inv.quantity,
        description: inv.item.description,
      }))
    };
  }

  private async searchShopItems(query?: string) {
    const where = query
      ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' as any } },
          { description: { contains: query, mode: 'insensitive' as any } },
        ],
      }
      : {};

    const items = await prisma.shopItem.findMany({
      where,
      take: 10,
    });

    return {
      items: items.map((item: any) => ({
        name: item.name,
        price: item.price,
        description: item.description,
        stock: item.stock,
      }))
    };
  }

  private async getServerEvents() {
    // Implementar lógica de eventos ativos
    // Por enquanto, retornar placeholder
    return { message: 'Sistema de eventos em desenvolvimento' };
  }

  private async getLeaderboard(type: string, limit: number) {
    switch (type) {
      case 'xp':
        const levelBoard = await prisma.level.findMany({
          orderBy: { xp: 'desc' },
          take: limit,
          include: { user: true },
        });
        return {
          leaderboard: levelBoard.map((l: any, i: number) => ({
            position: i + 1,
            username: l.user.username,
            level: l.level,
            xp: l.xp,
          }))
        };

      case 'money':
      case 'wallet':
      case 'bank':
        const field = type === 'money' ? undefined : type;
        const orderBy = field ? { [field]: 'desc' } : { wallet: 'desc' };

        const economyBoard = await prisma.economy.findMany({
          orderBy: orderBy as any,
          take: limit,
          include: { user: true },
        });

        return {
          leaderboard: economyBoard.map((e: any, i: number) => ({
            position: i + 1,
            username: e.user.username,
            wallet: Number(e.wallet),
            bank: Number(e.bank),
            total: Number(e.wallet + e.bank),
          }))
        };

      default:
        return { error: 'Tipo de leaderboard inválido' };
    }
  }

  // ============================================
  // PROCESSAMENTO PRINCIPAL
  // ============================================

  async processMessage(userId: string, username: string, message: string, retryCount = 0): Promise<string> {
    const startTime = Date.now();

    // Limite de retentativas para evitar loop infinito de chaves
    if (retryCount > 3) {
      return '❌ Desculpe, estou tendo dificuldades técnicas para acessar meus provedores de IA no momento. Tente novamente em alguns minutos.';
    }

    try {
      // 1. Sanitizar input
      const sanitized = this.sanitizeInput(message);

      // 2. Detectar injeção
      const injectionCheck = this.detectPromptInjection(sanitized);
      if (injectionCheck.isInjection) {
        return '🛡️ Desculpe, detectei algo suspeito na sua mensagem. Por favor, reformule sua pergunta de forma natural.';
      }

      // 3. Verificar rate limit do usuário
      const rateLimitCheck = await this.checkRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        const time = rateLimitCheck.resetIn! > 60
          ? `${Math.ceil(rateLimitCheck.resetIn! / 60)} minutos`
          : `${rateLimitCheck.resetIn} segundos`;
        return aiConfig.rate_limit.limit_message.replace('{time}', time);
      }

      // 4. Inicializar modelo com a melhor chave disponível
      await this.ensureModelInitialized();

      // 5. Carregar contexto
      const context = await this.loadUserContext(userId, username);

      // 6. Construir histórico de conversa
      const history = await this.buildConversationHistory(context, sanitized);

      // 7. Gerar resposta
      const chat = this.model.startChat({ history });
      let result;

      try {
        result = await chat.sendMessage(sanitized);
      } catch (apiError: any) {
        // Tratar erros de API (Rate Limit da Chave ou Autenticação)
        if (this.currentKey) {
          if (apiError.status === 429) {
            await KeyManagerService.handleRateLimit(this.currentKey.id);
            return this.processMessage(userId, username, message, retryCount + 1);
          } else if (apiError.status === 401 || apiError.status === 403) {
            if (aiConfig.key_management.auto_disable_on_auth_error) {
              await KeyManagerService.disableKey(this.currentKey.id, apiError.message);
              return this.processMessage(userId, username, message, retryCount + 1);
            }
          }
        }
        throw apiError;
      }

      // 8. Processar function calls
      let response = result.response;
      let functionCallCount = 0;

      while (response.functionCalls()?.length > 0 && functionCallCount < 5) {
        const functionCalls = response.functionCalls();
        const functionResponses = [];

        for (const call of functionCalls) {
          const functionResult = await this.executeFunctionCall(call.name, call.args);
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: functionResult,
            },
          });
        }

        result = await chat.sendMessage(functionResponses);
        response = result.response;
        functionCallCount++;
      }

      // Tentar pegar o texto. Se a IA só chamou função e não deu texto, response.text() pode falhar dependendo do estado
      let responseText = '';
      try {
        responseText = response.text();
      } catch (e) {
        logger.warn('[AIService] Resposta sem texto após function calls ou erro no modelo:', e);
        responseText = 'Eu processei suas informações, mas não consegui gerar uma resposta em texto. Como posso ajudar mais?';
      }

      // 9. Registrar uso de tokens (estimado se não retornado pela API)
      if (this.currentKey) {
        const usage = response.usageMetadata || { totalTokenCount: responseText.length / 4 + sanitized.length / 4 };
        await KeyManagerService.recordUsage(this.currentKey.id, usage.totalTokenCount);
      }

      // 10. Salvar interação na memória
      await this.saveInteraction(userId, sanitized, responseText, context);

      // 11. Atualizar perfil
      const interests = await this.detectInterests(sanitized);
      if (interests.length > 0) {
        await this.updateUserProfile(userId, { interests });
      }

      // 12. Registrar métricas
      await this.recordMetrics(startTime, functionCallCount);

      // 13. Salvar no histórico
      await this.saveConversationHistory(userId, sanitized, responseText);

      return responseText;

    } catch (error: any) {
      logger.error('Erro ao processar mensagem com IA:', error);
      await this.recordError();

      if (error.message === 'Nenhuma chave API disponível') {
        return '❌ Desculpe, todas as minhas chaves de IA estão temporariamente fora de serviço ou atingiram o limite. Tente novamente mais tarde.';
      }

      return '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.';
    }
  }

  private async loadUserContext(userId: string, username: string): Promise<UserContext> {
    const [shortTerm, mediumTerm, longTerm] = await Promise.all([
      this.getShortTermMemory(userId),
      this.getMediumTermMemory(userId),
      this.getLongTermMemory(userId),
    ]);

    return {
      userId,
      username,
      shortTermMemory: shortTerm,
      mediumTermSummary: mediumTerm || undefined,
      longTermProfile: longTerm,
    };
  }

  private async buildConversationHistory(context: UserContext, currentMessage: string): Promise<AIMessage[]> {
    const history: AIMessage[] = [];

    // Adicionar resumo de médio prazo se existir
    if (context.mediumTermSummary) {
      history.push({
        role: 'model',
        parts: [{ text: `[Contexto anterior: ${context.mediumTermSummary}]` }],
      });
    }

    // Adicionar memória de curto prazo
    if (context.shortTermMemory.length > 0) {
      history.push(...context.shortTermMemory);
    }

    return history;
  }

  private async saveInteraction(userId: string, userMessage: string, aiResponse: string, context: UserContext) {
    // Atualizar memória de curto prazo
    const newMemory: AIMessage[] = [
      ...context.shortTermMemory,
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ text: aiResponse }] },
    ];

    await this.saveShortTermMemory(userId, newMemory);
  }

  private async saveConversationHistory(userId: string, userMessage: string, aiResponse: string) {
    const sessionId = `${userId}-${new Date().toISOString().split('T')[0]}`;

    await prisma.aIConversation.createMany({
      data: [
        {
          userId,
          role: 'user',
          content: userMessage,
          sessionId,
        },
        {
          userId,
          role: 'assistant',
          content: aiResponse,
          sessionId,
        },
      ],
    });
  }

  private async recordMetrics(startTime: number, functionCalls: number) {
    const responseTime = Date.now() - startTime;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingMetric = await prisma.aIMetrics.findFirst({
      where: { date: today }
    });

    if (existingMetric) {
      await prisma.aIMetrics.update({
        where: { id: existingMetric.id },
        data: {
          totalInteractions: { increment: 1 },
          avgResponseTime: responseTime,
          functionCallsCount: { increment: functionCalls },
        }
      });
    } else {
      await prisma.aIMetrics.create({
        data: {
          date: today,
          totalInteractions: 1,
          avgResponseTime: responseTime,
          functionCallsCount: functionCalls,
        }
      });
    }
  }

  private async recordError() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingMetric = await prisma.aIMetrics.findFirst({
      where: { date: today }
    });

    if (existingMetric) {
      await prisma.aIMetrics.update({
        where: { id: existingMetric.id },
        data: { errorsCount: { increment: 1 } }
      });
    } else {
      await prisma.aIMetrics.create({
        data: { date: today, errorsCount: 1 }
      });
    }
  }
}
