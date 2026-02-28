import { EmbedBuilder } from 'discord.js';
import { prisma } from '../database/client.js';
import { EMBED_COLORS, EMBED_CREDIT } from '../shared/embedTheme.js';
import { logger } from '../shared/logger.js';
export class RollService {
    static async handleMessage(message) {
        if (message.author.bot)
            return false;
        try {
            // Buscar se a mensagem exata é um gatilho de roll
            const roll = await prisma.roll.findUnique({
                where: { trigger: message.content.trim() },
                include: { options: true }
            });
            if (!roll || roll.options.length === 0)
                return false;
            // Sorteio baseado em pesos
            const totalWeight = roll.options.reduce((sum, opt) => sum + opt.weight, 0);
            let random = Math.floor(Math.random() * totalWeight);
            let selectedOption = roll.options[0];
            for (const option of roll.options) {
                if (random < option.weight) {
                    selectedOption = option;
                    break;
                }
                random -= option.weight;
            }
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLORS.SECONDARY)
                .setTitle(roll.title)
                .setDescription(roll.description || null)
                .addFields({ name: '🎲 Resultado', value: selectedOption.text })
                .setFooter({ text: EMBED_CREDIT })
                .setTimestamp();
            if (roll.image)
                embed.setImage(roll.image);
            if (roll.thumbnail)
                embed.setThumbnail(roll.thumbnail);
            await message.reply({ embeds: [embed] });
            return true;
        }
        catch (error) {
            logger.error('Erro ao processar Roll:', error);
            return false;
        }
    }
}
//# sourceMappingURL=rollService.js.map