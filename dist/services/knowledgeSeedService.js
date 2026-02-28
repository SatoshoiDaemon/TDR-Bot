import { ChannelType } from 'discord.js';
import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
import { aiConfig } from '../shared/config/yamlLoader.js';
export class KnowledgeSeedService {
    /**
     * Popula o banco de dados com conhecimento dos sistemas do servidor
     */
    static async seedFromChannels(client, guildId) {
        if (!aiConfig.knowledge_seed.auto_seed) {
            logger.info('Seed automático de conhecimento desabilitado');
            return;
        }
        const categoryId = aiConfig.knowledge_seed.systems_category_id;
        if (!categoryId) {
            logger.warn('ID da categoria de sistemas não configurado');
            return;
        }
        try {
            const guild = await client.guilds.fetch(guildId);
            const category = guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                logger.error(`Categoria ${categoryId} não encontrada ou não é uma categoria`);
                return;
            }
            logger.info(`Iniciando seed de conhecimento da categoria: ${category.name}`);
            // Buscar todos os canais da categoria
            const channels = category.children.cache.filter(ch => ch.type === ChannelType.GuildText);
            let totalMessages = 0;
            let totalKnowledge = 0;
            for (const [channelId, channel] of channels) {
                const textChannel = channel;
                logger.info(`Processando canal: ${textChannel.name}`);
                // 1. Processar mensagens do canal principal
                const channelKnowledge = await this.processChannelMessages(textChannel, textChannel.name);
                totalMessages += channelKnowledge.messages;
                totalKnowledge += channelKnowledge.knowledge;
                // 2. Processar Tópicos (Threads) do canal
                try {
                    // Buscar tópicos ativos
                    const activeThreads = await textChannel.threads.fetchActive();
                    // Buscar tópicos arquivados
                    const archivedThreads = await textChannel.threads.fetchArchived();
                    const allThreads = [...activeThreads.threads.values(), ...archivedThreads.threads.values()];
                    for (const thread of allThreads) {
                        logger.info(`Processando tópico: ${thread.name} em ${textChannel.name}`);
                        const threadKnowledge = await this.processChannelMessages(thread, `${textChannel.name} > ${thread.name}`);
                        totalMessages += threadKnowledge.messages;
                        totalKnowledge += threadKnowledge.knowledge;
                    }
                }
                catch (error) {
                    logger.error(`Erro ao processar tópicos do canal ${textChannel.name}:`, error);
                }
            }
            logger.info(`Seed concluído: ${totalKnowledge} entradas criadas de ${totalMessages} mensagens em ${channels.size} canais`);
        }
        catch (error) {
            logger.error('Erro ao fazer seed de conhecimento:', error);
        }
    }
    /**
     * Popula conhecimento com dados manuais (fallback)
     */
    static async seedManualKnowledge() {
        logger.info('Populando conhecimento manual do sistema');
        const knowledgeBase = [
            // Economia
            {
                category: 'economia',
                title: 'Sistema de Economia',
                content: `O servidor TDR possui um sistema de economia completo com carteira e banco. 
        Os jogadores podem ganhar dracmas através de recompensas diárias (rg!daily), coletando por cargos (rg!collect), 
        jogando minigames (blackjack, roulette, mines) ou roubando outros jogadores (rg!rob).
        O dracmas pode ser armazenado na carteira (wallet) ou depositado no banco para maior segurança.`,
                keywords: ['economia', 'dracmas', 'carteira', 'banco', 'daily', 'collect'],
                priority: 10,
            },
            {
                category: 'economia',
                title: 'Loja do Servidor',
                content: `A loja (rg!shop) permite comprar itens usando o dracmas do servidor. 
        Os itens podem dar vantagens como cargos especiais, XP bônus ou outros benefícios. 
        Use rg!inventory para ver seus itens comprados.`,
                keywords: ['loja', 'shop', 'comprar', 'itens', 'inventário'],
                priority: 8,
            },
            {
                category: 'economia',
                title: 'Transferências de Dracmas',
                content: `Use o comando rg!pay @usuário <valor> para transferir dracmas para outro jogador. 
        As transferências são instantâneas e seguras.`,
                keywords: ['pay', 'transferir', 'enviar', 'dracmas'],
                priority: 5,
            },
            // Leveling
            {
                category: 'leveling',
                title: 'Sistema de Leveling',
                content: `O sistema de leveling recompensa jogadores ativos. Você ganha XP ao enviar mensagens no servidor. 
        Quanto mais ativo você for, mais rápido sobe de nível. Use rg!rank para ver seu nível e XP atual.
        Use rg!leaderboard xp para ver o ranking de níveis do servidor.`,
                keywords: ['level', 'nível', 'xp', 'experiência', 'rank', 'ranking'],
                priority: 10,
            },
            {
                category: 'leveling',
                title: 'Perfil de Jogador',
                content: `Use rg!profile para ver seu perfil completo, incluindo nível, XP, dracmas e badges. 
        Você pode personalizar seu perfil com rg!profile-edit.`,
                keywords: ['perfil', 'profile', 'personalizar', 'badges'],
                priority: 7,
            },
            // Roleplay
            {
                category: 'roleplay',
                title: 'Sistema de Dados',
                content: `O bot detecta automaticamente rolagens de dados no chat. 
        Você pode rolar dados usando a notação padrão: 1d20 (um dado de 20 lados), 2d6+5 (dois dados de 6 lados mais 5), etc.
        O bot calculará automaticamente o resultado e mostrará os detalhes.`,
                keywords: ['dados', 'dice', 'roll', 'rolar', 'd20', 'd6'],
                priority: 9,
            },
            {
                category: 'roleplay',
                title: 'Rolls Dinâmicos',
                content: `Mestres podem criar rolls personalizados usando /create-roll. 
        Esses rolls são ativados quando jogadores digitam palavras-chave específicas no chat, 
        como "rolar classe" ou "rolar origem". O sistema sorteia automaticamente entre as opções configuradas.`,
                keywords: ['roll', 'dinâmico', 'criar', 'sorteio', 'classe', 'origem'],
                priority: 8,
            },
            // Eventos
            {
                category: 'eventos',
                title: 'Eventos Aleatórios',
                content: `O servidor possui eventos aleatórios que acontecem periodicamente:
        - Chuva de Dracmas: Ganhe dracmas ao enviar mensagens durante o evento
        - Zona Quente de XP: Ganhe XP multiplicado em canais específicos
        - Enigmas: Resolva enigmas para ganhar recompensas
        - Reações Premiadas: Seja rápido para reagir e ganhar prêmios`,
                keywords: ['eventos', 'chuva', 'dracmas', 'zona', 'quente', 'xp', 'enigma'],
                priority: 7,
            },
            {
                category: 'eventos',
                title: 'Clima Elemental',
                content: `Todo dia às 07:00 é anunciado o clima elemental do dia. 
        Cada elemento (Fogo, Água, Terra, Ar, Luz, Trevas, Veneno) pode dar bônus especiais durante o dia.`,
                keywords: ['clima', 'elemental', 'elemento', 'fogo', 'água', 'terra'],
                priority: 6,
            },
            // Utilitários
            {
                category: 'utilitários',
                title: 'Sistema AFK',
                content: `Use rg!afk <motivo> para definir um status de ausência. 
        Quando alguém te mencionar, o bot avisará que você está AFK. 
        O status é removido automaticamente quando você enviar uma mensagem.`,
                keywords: ['afk', 'ausente', 'away'],
                priority: 5,
            },
            {
                category: 'utilitários',
                title: 'Lembretes',
                content: `Use rg!remind <tempo> <mensagem> para criar lembretes. 
        Exemplos: rg!remind 1h Verificar servidor, rg!remind 30m Fazer backup.
        Você pode adicionar "dm" no final para receber o lembrete por mensagem direta.`,
                keywords: ['remind', 'lembrete', 'reminder'],
                priority: 5,
            },
            {
                category: 'utilitários',
                title: 'Comandos de Informação',
                content: `Comandos úteis:
        - rg!serverinfo: Informações do servidor
        - rg!userinfo @usuário: Informações de um usuário
        - rg!avatar @usuário: Ver avatar em alta resolução
        - rg!botinfo: Informações sobre o bot
        - rg!ping: Verificar latência do bot`,
                keywords: ['info', 'informação', 'servidor', 'usuário', 'avatar', 'ping'],
                priority: 4,
            },
            // Jogos
            {
                category: 'jogos',
                title: 'Blackjack',
                content: `Use rg!blackjack <aposta> para jogar Blackjack contra o dealer. 
        Tente chegar o mais próximo de 21 sem estourar. Você pode pedir cartas (Hit) ou parar (Stand).`,
                keywords: ['blackjack', '21', 'cartas', 'apostar'],
                priority: 6,
            },
            {
                category: 'jogos',
                title: 'Roulette',
                content: `Use rg!roulette <aposta> <cor> para jogar roleta. 
        Escolha entre red (vermelho) ou black (preto). Se acertar, ganha o dobro da aposta.`,
                keywords: ['roulette', 'roleta', 'vermelho', 'preto', 'red', 'black'],
                priority: 6,
            },
            {
                category: 'jogos',
                title: 'Mines',
                content: `Use rg!mines <aposta> <bombas> para jogar campo minado. 
        Revele casas sem bombas para multiplicar sua aposta. Quanto mais bombas, maior o multiplicador mas maior o risco.`,
                keywords: ['mines', 'campo', 'minado', 'bombas'],
                priority: 6,
            },
        ];
        try {
            for (const knowledge of knowledgeBase) {
                await prisma.systemKnowledge.upsert({
                    where: {
                        id: `manual-${knowledge.category}-${knowledge.title.toLowerCase().replace(/\s+/g, '-')}`,
                    },
                    update: knowledge,
                    create: {
                        ...knowledge,
                        id: `manual-${knowledge.category}-${knowledge.title.toLowerCase().replace(/\s+/g, '-')}`,
                    },
                });
            }
            logger.info(`${knowledgeBase.length} entradas de conhecimento manual criadas/atualizadas`);
        }
        catch (error) {
            logger.error('Erro ao popular conhecimento manual:', error);
        }
    }
    /**
     * Limpa o nome do canal de emojis, símbolos e fontes especiais
     */
    /**
     * Limpa o nome do canal de emojis, símbolos e fontes especiais
     */
    static sanitizeChannelName(name) {
        return name
            .normalize('NFKD') // NFKD converte caracteres estilizados (Unicode) para ASCII
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^\w\s-]/g, ' ') // Remove emojis e símbolos especiais
            .replace(/\s+/g, ' ') // Normaliza espaços
            .trim()
            .toLowerCase();
    }
    /**
     * Processa mensagens de um canal ou tópico e salva no banco
     */
    static async processChannelMessages(channel, contextName) {
        let messagesCount = 0;
        let knowledgeCount = 0;
        try {
            const messages = await channel.messages.fetch({ limit: 50 });
            messagesCount = messages.size;
            for (const [msgId, message] of messages) {
                let content = message.content || '';
                if (message.embeds.length > 0) {
                    const embedContent = message.embeds.map(embed => {
                        const parts = [];
                        if (embed.title)
                            parts.push(embed.title);
                        if (embed.description)
                            parts.push(embed.description);
                        if (embed.fields.length > 0) {
                            embed.fields.forEach(f => parts.push(`${f.name}: ${f.value}`));
                        }
                        return parts.join('\n');
                    }).join('\n\n');
                    content = content ? `${content}\n\n${embedContent}` : embedContent;
                }
                if (content.length < 30)
                    continue;
                const category = this.extractCategory(contextName);
                const keywords = this.extractKeywords(content);
                // Adicionar o nome do contexto (Canal > Tópico) ao título para melhor referência
                const baseTitle = this.generateTitle(content);
                const fullTitle = contextName.includes('>')
                    ? `[${contextName.split('>')[1].trim()}] ${baseTitle}`
                    : baseTitle;
                // Sanitizar conteúdo para evitar erros de banco de dados (hex escape, null bytes)
                const sanitizedContent = this.sanitizeContent(content);
                await prisma.systemKnowledge.create({
                    data: {
                        category,
                        title: fullTitle,
                        content: sanitizedContent,
                        keywords,
                        channelId: channel.id,
                        priority: contextName.includes('>') ? 1 : 0, // Tópicos têm leve prioridade por serem mais específicos
                    },
                });
                knowledgeCount++;
            }
        }
        catch (error) {
            logger.error(`Erro ao processar mensagens de ${contextName}:`, error);
        }
        return { messages: messagesCount, knowledge: knowledgeCount };
    }
    /**
     * Extrai categoria do nome do canal (suporta nomes decorados)
     */
    static extractCategory(channelName) {
        const cleanName = this.sanitizeChannelName(channelName);
        const categories = {
            economia: ['economia', 'money', 'dracmas', 'loja', 'shop', 'banco', 'bank'],
            leveling: ['level', 'xp', 'rank', 'ranking', 'niveis', 'nivel'],
            roleplay: ['rp', 'roleplay', 'dados', 'dice', 'roll', 'sistema'],
            eventos: ['eventos', 'event', 'clima', 'weather', 'avisos'],
            jogos: ['jogos', 'games', 'blackjack', 'roulette', 'mines', 'cassino'],
        };
        for (const [category, keywords] of Object.entries(categories)) {
            for (const keyword of keywords) {
                if (cleanName.includes(keyword)) {
                    return category;
                }
            }
        }
        return 'geral';
    }
    /**
     * Extrai keywords do conteúdo (limpando Markdown e decorações)
     */
    static extractKeywords(content) {
        // Remover Markdown (negrito, itálico, code blocks, links)
        const noMarkdown = content
            .replace(/\*\*\*| \*\*| \*/g, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`.*?`/g, '')
            .replace(/\[.*?\]\(.*?\)/g, '');
        // Remover pontuação, símbolos e converter para minúsculas
        const cleaned = noMarkdown.toLowerCase().replace(/[^\w\s]/g, ' ');
        // Dividir em palavras
        const words = cleaned.split(/\s+/);
        // Filtrar palavras muito curtas e stopwords comuns
        const stopwords = [
            'o', 'a', 'de', 'da', 'do', 'para', 'com', 'em', 'no', 'na', 'os', 'as', 'um', 'uma',
            'que', 'se', 'por', 'como', 'dos', 'das', 'pelo', 'pela', 'este', 'esta', 'isso'
        ];
        const keywords = words.filter(word => word.length > 3 &&
            !stopwords.includes(word) &&
            !/^\d+$/.test(word) // Ignorar números puros
        );
        // Remover duplicatas e retornar as 15 primeiras (mais contexto)
        return [...new Set(keywords)].slice(0, 15);
    }
    /**
     * Gera título do conteúdo
     */
    static generateTitle(content) {
        // Pegar primeira linha ou primeiras 60 caracteres
        const firstLine = content.split('\n')[0];
        const title = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
        return title;
    }
    /**
     * Sanitiza conteúdo para remover caracteres inválidos para o banco (null bytes, escapes quebrados)
     */
    static sanitizeContent(content) {
        if (!content)
            return '';
        return content
            // Remove null bytes
            .replace(/\u0000/g, '')
            // Remove caracteres de controle problemáticos (exceto newline/tab)
            .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            // Normaliza para garantir UTF-8 válido
            .normalize('NFC');
    }
    /**
     * Limpa conhecimento antigo
     */
    static async clearKnowledge() {
        try {
            const deleted = await prisma.systemKnowledge.deleteMany({});
            logger.info(`${deleted.count} entradas de conhecimento removidas`);
        }
        catch (error) {
            logger.error('Erro ao limpar conhecimento:', error);
        }
    }
}
//# sourceMappingURL=knowledgeSeedService.js.map