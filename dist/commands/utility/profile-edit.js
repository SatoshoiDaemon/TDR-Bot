import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../../database/client.js';
export const profileEditCommand = {
    name: 'perfil-edit',
    description: 'Edita as informações e a aparência do seu perfil',
    data: new SlashCommandBuilder()
        .setName('perfil-edit')
        .setDescription('Edita as informações e a aparência do seu perfil'),
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('modal_profile_edit')
            .setTitle('Editar Perfil');
        const aboutInput = new TextInputBuilder()
            .setCustomId('about')
            .setLabel('Sobre Mim')
            .setPlaceholder('Escreva uma frase para o seu perfil...')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(200)
            .setRequired(false);
        const colorInput = new TextInputBuilder()
            .setCustomId('color')
            .setLabel('Cor da Embed (Hex)')
            .setPlaceholder('#5865F2')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        const thumbInput = new TextInputBuilder()
            .setCustomId('thumbnail')
            .setLabel('Thumbnail (URL ou {user.avatar})')
            .setPlaceholder('{user.avatar}')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        const imageInput = new TextInputBuilder()
            .setCustomId('image')
            .setLabel('Imagem de Fundo (URL ou {server.avatar})')
            .setPlaceholder('URL da imagem...')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        modal.addComponents(new ActionRowBuilder().addComponents(aboutInput), new ActionRowBuilder().addComponents(colorInput), new ActionRowBuilder().addComponents(thumbInput), new ActionRowBuilder().addComponents(imageInput));
        await interaction.showModal(modal);
        const submitted = await interaction.awaitModalSubmit({ time: 120000 }).catch(() => null);
        if (submitted) {
            const aboutMe = submitted.fields.getTextInputValue('about');
            const profileColor = submitted.fields.getTextInputValue('color');
            const thumbnailImage = submitted.fields.getTextInputValue('thumbnail');
            const profileImage = submitted.fields.getTextInputValue('image');
            // Validar Cor Hex
            const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (profileColor && !hexRegex.test(profileColor)) {
                return submitted.reply({ content: 'Cor inválida. Use formato Hex (ex: #FF0000).', flags: MessageFlags.Ephemeral });
            }
            await prisma.user.upsert({
                where: { id: interaction.user.id },
                update: {
                    aboutMe: aboutMe || undefined,
                    profileColor: profileColor || undefined,
                    thumbnailImage: thumbnailImage || undefined,
                    profileImage: profileImage || undefined
                },
                create: {
                    id: interaction.user.id,
                    username: interaction.user.username,
                    aboutMe: aboutMe || undefined,
                    profileColor: profileColor || undefined,
                    thumbnailImage: thumbnailImage || undefined,
                    profileImage: profileImage || undefined
                }
            });
            await submitted.reply({ content: 'Perfil atualizado. Use `/perfil` para visualizar.', flags: MessageFlags.Ephemeral });
        }
    }
};
//# sourceMappingURL=profile-edit.js.map