import { EmbedBuilder } from 'discord.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../shared/embedTheme.js';
import { EventService } from '../services/eventService.js';
export class DiceRoller {
    // Regex mais restritiva: 
    // - Usa negative lookbehind para evitar matches após letras, : ou /
    // - Usa negative lookahead para evitar matches antes de letras
    // - Limita quantidade de dados (1-100) e faces (1-1000)
    static DICE_REGEX = /(?<![a-zA-Z:\/])(\d{1,3})d(\d{1,4})(?:\s*([+-])\s*(\d+))?(?![a-zA-Z])/gi;
    static MAX_DICE = 100;
    static MAX_SIDES = 10000;
    // Padrões para ignorar (URLs, convites, etc.)
    static IGNORE_PATTERNS = [
        /https?:\/\//i,
        /discord\.gg\//i,
        /discord\.com\/invite\//i,
        /discordapp\.com\/invite\//i,
    ];
    static handleMessage(message) {
        if (message.author.bot)
            return false;
        // Ignorar mensagens com links e convites
        const content = message.content;
        for (const pattern of this.IGNORE_PATTERNS) {
            if (pattern.test(content))
                return false;
        }
        // Verificar se o canal está em categoria bloqueada
        const channel = message.channel;
        if ('parentId' in channel && channel.parentId) {
            try {
                const config = EventService.getConfig();
                if (config?.blacklist_categories?.includes(channel.parentId)) {
                    return false;
                }
            }
            catch {
                // Config não disponível, continuar normalmente
            }
        }
        const matches = [...content.matchAll(this.DICE_REGEX)];
        if (matches.length === 0)
            return false;
        const results = [];
        for (const match of matches.slice(0, 5)) { // Limite de 5 rolagens por mensagem para evitar spam
            const count = parseInt(match[1]);
            const sides = parseInt(match[2]);
            const modifierOp = match[3];
            const modifierVal = match[4] ? parseInt(match[4]) : 0;
            if (count > this.MAX_DICE || sides > this.MAX_SIDES || count <= 0 || sides <= 0) {
                continue;
            }
            const rolls = [];
            let sum = 0;
            for (let i = 0; i < count; i++) {
                const roll = Math.floor(Math.random() * sides) + 1;
                rolls.push(roll);
                sum += roll;
            }
            let finalTotal = sum;
            let modifierText = '';
            if (modifierOp === '+') {
                finalTotal += modifierVal;
                modifierText = ` + ${modifierVal}`;
            }
            else if (modifierOp === '-') {
                finalTotal -= modifierVal;
                modifierText = ` - ${modifierVal}`;
            }
            const rollsText = rolls.length > 10 ? `${rolls.slice(0, 10).join(', ')}...` : rolls.join(', ');
            results.push(`🎲 **${match[0]}**\nResultados: \`[${rollsText}]\`${modifierText}\nTotal: **${finalTotal}**`);
        }
        if (results.length > 0) {
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.PRIMARY)
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setDescription(results.join('\n\n'))
                .setFooter({ text: EMBED_CREDIT })
                .setTimestamp();
            message.reply({ embeds: [embed] }).catch(() => { });
            // Incrementar progresso da missão de dados
            import('../services/questService.js').then(({ QuestService, QuestType }) => {
                QuestService.incrementProgress(message.author.id, message.guildId, QuestType.DICE, results.length);
            });
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=diceRoller.js.map