import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../database/client.js';
import { logger } from '../shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../shared/embedTheme.js';
import { EventService, EventType } from '../services/eventService.js';
export class EventScheduler {
    client;
    lastEventType = null;
    lastEnigmaIndex = -1;
    recentEnigmaIndices = [];
    constructor(client) {
        this.client = client;
        EventService.loadConfig();
        this.loadEnigmaHistory();
    }
    async loadEnigmaHistory() {
        const data = await prisma.systemConfig.findUnique({ where: { key: 'enigma_history' } });
        if (data && data.value) {
            try {
                this.recentEnigmaIndices = JSON.parse(data.value);
            }
            catch (e) {
                this.recentEnigmaIndices = [];
            }
        }
    }
    async saveEnigmaHistory() {
        await prisma.systemConfig.upsert({
            where: { key: 'enigma_history' },
            update: { value: JSON.stringify(this.recentEnigmaIndices) },
            create: { key: 'enigma_history', value: JSON.stringify(this.recentEnigmaIndices) }
        });
    }
    start() {
        const config = EventService.getConfig();
        if (!config.enabled)
            return;
        // Sorteio de eventos aleatórios
        setInterval(() => this.tryStartRandomEvent(), config.check_interval_minutes * 60 * 1000);
        // Promoções diárias (Verificar a cada hora se já rodou hoje)
        setInterval(() => this.checkDailyDeals(), 60 * 60 * 1000);
        logger.info('Serviço de Eventos iniciado.');
    }
    async tryStartRandomEvent() {
        const config = EventService.getConfig();
        const volume = EventService.getAndResetMessageCount();
        // Se poucas mensagens (menos de 5 no intervalo), pular evento ou reduzir chance drasticamente
        if (volume < 5)
            return;
        // Multiplicador de chance baseado no volume (Ex: 20 msg = 2x chance, cap em 3x)
        const activityMultiplier = Math.min(Math.max(1, volume / 10), 3);
        const rand = Math.random();
        const { money_rain, hot_zone, enigma_challenge, diamond_reaction } = config.random_events;
        // Build eligible events using the activityMultiplier heavily to scale chances directly with volume!
        const events = [];
        if (money_rain?.enabled)
            events.push({ type: 'money_rain', chance: money_rain.chance * activityMultiplier, fn: () => this.startMoneyRain() });
        if (hot_zone?.enabled)
            events.push({ type: 'hot_zone', chance: hot_zone.chance * activityMultiplier, fn: () => this.startHotZone() });
        if (enigma_challenge?.enabled)
            events.push({ type: 'enigma', chance: enigma_challenge.chance * activityMultiplier * 1.5, fn: () => this.startEnigma() }); // Boost enigma even more
        if (diamond_reaction?.enabled)
            events.push({ type: 'diamond', chance: diamond_reaction.chance * activityMultiplier, fn: () => this.startDiamond() });
        // Filter out the last event type to avoid consecutive repeats
        const eligible = events.filter(e => e.type !== this.lastEventType);
        if (eligible.length === 0)
            return;
        // Weighted random selection
        const totalChance = eligible.reduce((sum, e) => sum + e.chance, 0);
        if (rand > totalChance)
            return; // No event triggered
        let cumulative = 0;
        for (const event of eligible) {
            cumulative += event.chance;
            if (rand < cumulative) {
                this.lastEventType = event.type;
                await event.fn();
                return;
            }
        }
    }
    // =========================================
    // Enigma Challenge — 30+ riddles with anti-repeat
    // =========================================
    static ENIGMAS = [
        // Anime & Mangá
        { q: 'Qual a verdadeira identidade do L de Death Note?', a: ['lawliet', 'l lawliet'] },
        { q: 'Qual o nome do pirata cuja execução iniciou a Grande Era dos Piratas em One Piece?', a: ['gol d roger', 'roger', 'gold roger'] },
        { q: 'Qual o estúdio responsável pela animação de Demon Slayer (Kimetsu no Yaiba)?', a: ['ufotable'] },
        { q: 'Quem é o mestre de Naruto Uzumaki que tem uma afinidade por literatura adulta?', a: ['jiraiya'] },
        { q: 'Qual anime é focado no uso da "Alquimia", regido pela Lei da Troca Equivalente?', a: ['fullmetal alchemist', 'fullmetal alchemist brotherhood', 'fma'] },
        { q: 'Qual personagem de Attack on Titan jura eliminar até o último titã da face da terra?', a: ['eren', 'eren yeager', 'eren jaeger'] },
        { q: 'No anime Bleach, qual é o nome da espada (Zanpakuto) de Ichigo Kurosaki?', a: ['zangetsu'] },
        { q: 'Qual o nome original japonês do anime "Cavaleiros do Zodíaco"?', a: ['saint seiya'] },
        { q: 'Em qual anime os personagens caçam as "Esferas do Dragão"?', a: ['dragon ball', 'dragon ball z'] },
        { q: 'No mangá/anime Berserk, qual o nome do espadachim negro protagonista da série?', a: ['guts'] },
        // Games
        { q: 'Qual a empresa que desenvolveu a franquia The Legend of Zelda?', a: ['nintendo'] },
        { q: 'O que a sigla FPS representa em jogos de tiro?', a: ['first person shooter', 'first-person shooter'] },
        { q: 'Qual foi o ano de lançamento original de Minecraft?', a: ['2009', '2011'] },
        { q: 'Qual a famosa frase que Scorpion grita ao jogar sua lança em Mortal Kombat?', a: ['get over here', 'come here'] },
        { q: 'Qual o item usado para capturar criaturas na franquia Pokémon?', a: ['pokebola', 'pokébola', 'pokeball'] },
        { q: 'Qual é a famosa série de jogos de RPG da FromSoftware que popularizou a frase "Praise the Sun"?', a: ['dark souls'] },
        { q: 'Em Final Fantasy VII, qual é o nome do antagonista principal de cabelos prateados?', a: ['sephiroth'] },
        { q: 'No jogo The Witcher 3, qual o nome do protagonista bruxo?', a: ['geralt', 'geralt de rivia'] },
        { q: 'Qual é o bloco mais resistente de Minecraft, comumente usado como limite do mundo?', a: ['bedrock', 'rocha matriz'] },
        { q: 'Qual é a corporação maligna responsável pela epidemia de zumbis em Resident Evil?', a: ['umbrella', 'umbrella corporation'] },
        // Cultura Pop & Filmes/Heróis
        { q: 'Qual a verdadeira identidade de Darth Vader?', a: ['anakin skywalker', 'anakin'] },
        { q: 'Qual o material quase indestrutível de que são feitas as garras do Wolverine?', a: ['adamantium'] },
        { q: 'Em "Senhor dos Anéis", quem diz a famosa frase "You shall not pass!" ("Você não passará!")?', a: ['gandalf'] },
        { q: 'Qual o verdadeiro nome do Batman?', a: ['bruce wayne'] },
        { q: 'Em Harry Potter, qual magia encarregada de desarmar o oponente e que virou assinatura de Harry?', a: ['expelliarmus'] },
        { q: 'Qual cor revela o Sabre de Luz tradicional de um mestre Sith em Star Wars?', a: ['vermelho', 'vermelha'] },
        { q: 'Em Matrix, qual a cor da pílula que Neo escolhe tomar para acordar no mundo real?', a: ['vermelha', 'vermelho'] },
        { q: 'Stan Lee é mundialmente famoso por ser o rosto e maior autor de qual editora de quadrinhos?', a: ['marvel', 'marvel comics'] }
    ];
    async startEnigma() {
        const config = EventService.getConfig().random_events.enigma_challenge;
        const channel = this.getRandomChannel();
        if (!channel)
            return;
        // Anti-repeat: pick a random enigma not in recent history
        let index;
        const pool = EventScheduler.ENIGMAS;
        const maxRecent = Math.min(Math.floor(pool.length * 0.6), 20); // remember 60% of pool
        let attempts = 0;
        do {
            index = Math.floor(Math.random() * pool.length);
            attempts++;
        } while (this.recentEnigmaIndices.includes(index) && attempts < 50);
        // Track recent indices
        this.recentEnigmaIndices.push(index);
        if (this.recentEnigmaIndices.length > maxRecent) {
            this.recentEnigmaIndices.shift();
        }
        await this.saveEnigmaHistory();
        const enigma = pool[index];
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.WARNING)
            .setTitle('🧩 DESAFIO DO ENIGMA!')
            .setDescription(`O primeiro a responder corretamente ganha uma recompensa!\n\n**Pergunta:** ${enigma.q}`)
            .setFooter({ text: 'Responda no chat para ganhar! (60 segundos)' });
        const msg = await channel.send({ embeds: [embed] });
        const collector = channel.createMessageCollector({
            filter: m => {
                const answer = m.content.toLowerCase().trim();
                return !m.author.bot && enigma.a.some(a => answer.includes(a.toLowerCase()));
            },
            max: 1,
            time: 60000
        });
        collector.on('collect', async (m) => {
            const reward = Math.floor(Math.random() * (config.reward_max - config.reward_min + 1)) + config.reward_min;
            await prisma.economy.upsert({
                where: { userId: m.author.id },
                update: { wallet: { increment: BigInt(reward) } },
                create: { userId: m.author.id, wallet: BigInt(reward) }
            });
            await m.reply(`🎉 **CORRETO!** Você resolveu o enigma e ganhou **${reward}** dracmas!`);
        });
        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const correctAnswers = enigma.a.join(', ');
                channel.send(`⏰ **Tempo esgotado!** Ninguém acertou. A resposta era: **${correctAnswers}**`);
            }
        });
    }
    async startDiamond() {
        const config = EventService.getConfig().random_events.diamond_reaction;
        const channel = this.getRandomChannel();
        if (!channel)
            return;
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.PRIMARY)
            .setTitle('💎 DIAMANTE APARECEU!')
            .setDescription(config.message)
            .setFooter({ text: 'Seja rápido!' });
        const msg = await channel.send({ embeds: [embed] });
        await msg.react('💎');
        const filter = (reaction, user) => reaction.emoji.name === '💎' && !user.bot;
        const collector = msg.createReactionCollector({ filter, max: 1, time: 30000 });
        collector.on('collect', async (reaction, user) => {
            await prisma.economy.upsert({
                where: { userId: user.id },
                update: { wallet: { increment: BigInt(config.reward) } },
                create: { userId: user.id, wallet: BigInt(config.reward) }
            });
            await channel.send(`💎 **${user.username}** foi o mais rápido e coletou o diamante de **${config.reward}** dracmas!`);
        });
    }
    async startMoneyRain() {
        const config = EventService.getConfig().random_events.money_rain;
        EventService.startRandomEvent(EventType.MONEY_RAIN, config.duration_minutes);
        const channel = this.getRandomChannel();
        if (channel) {
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(EMBED_COLORS.SUCCESS)
                        .setTitle('💸 CHUVA DE DRACMAS!')
                        .setDescription(config.message.replace('{duration}', config.duration_minutes.toString()))
                        .setFooter({ text: EMBED_CREDIT })
                ]
            });
        }
    }
    async startHotZone() {
        const config = EventService.getConfig().random_events.hot_zone;
        const channel = this.getRandomChannel();
        if (!channel)
            return;
        EventService.startRandomEvent(EventType.HOT_ZONE, config.duration_minutes, { channelId: channel.id });
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(EMBED_COLORS.WARNING)
                    .setTitle('🔥 ZONA QUENTE ATIVADA!')
                    .setDescription(config.message
                    .replace('{channel}', channel.toString())
                    .replace('{multiplier}', config.xp_multiplier.toString())
                    .replace('{duration}', config.duration_minutes.toString()))
                    .setFooter({ text: EMBED_CREDIT })
            ]
        });
    }
    async checkDailyDeals() {
        const now = new Date();
        if (now.getHours() !== 0)
            return; // Rodar apenas na primeira hora do dia
        const config = EventService.getConfig().fixed_events.daily_shop_deals;
        if (!config.enabled || !config.notification_channel_id)
            return;
        try {
            const items = await prisma.shopItem.findMany();
            if (items.length === 0)
                return;
            // Sortear itens para desconto
            const shuffled = items.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, config.max_items);
            const channel = this.client.channels.cache.get(config.notification_channel_id);
            if (!channel)
                return;
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setTitle('🏷️ OFERTAS DO DIA!')
                .setDescription('Os seguintes itens estão com **30% de desconto** apenas hoje!')
                .setFooter({ text: EMBED_CREDIT })
                .setTimestamp();
            const row = new ActionRowBuilder();
            selected.forEach((item) => {
                const discountedPrice = Math.floor(item.price * (1 - config.discount_percentage));
                embed.addFields({
                    name: `${item.icon || '📦'} ${item.name}`,
                    value: `~~${item.price}~~ por **${discountedPrice}** dracmas`,
                    inline: true
                });
                row.addComponents(new ButtonBuilder()
                    .setCustomId(`buy_${item.id}`)
                    .setLabel(`Comprar ${item.name}`)
                    .setStyle(ButtonStyle.Success));
            });
            await channel.send({ embeds: [embed], components: [row] });
            logger.info('Ofertas diárias enviadas.');
        }
        catch (error) {
            logger.error('Erro ao gerar ofertas diárias:', error);
        }
    }
    /**
     * Gets a random eligible channel respecting whitelist and blacklist.
     * If whitelist_channels has entries, ONLY those channels are used.
     * Otherwise, all text channels are used EXCEPT blacklisted ones and blacklisted categories.
     */
    getRandomChannel() {
        const guild = this.client.guilds.cache.first();
        if (!guild)
            return null;
        const config = EventService.getConfig();
        const whitelistChannels = config.whitelist_channels || [];
        const blacklistChannels = config.blacklist_channels || [];
        const blacklistCategories = config.blacklist_categories || [];
        let channels;
        if (whitelistChannels.length > 0) {
            // Whitelist mode: only use whitelisted channels
            channels = guild.channels.cache.filter(c => c.isTextBased() &&
                !c.isDMBased() &&
                whitelistChannels.includes(c.id));
        }
        else {
            // Blacklist mode: use all channels except blacklisted
            channels = guild.channels.cache.filter(c => c.isTextBased() &&
                !c.isDMBased() &&
                !blacklistChannels.includes(c.id) &&
                !blacklistCategories.includes(c.parentId ?? ''));
        }
        if (channels.size === 0)
            return null;
        return channels.random();
    }
}
//# sourceMappingURL=eventScheduler.js.map