import {
    SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits,
    MessageFlags, Role, User, EmbedBuilder
} from 'discord.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';

const DANGEROUS_PERMISSIONS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
];

function isRoleDangerous(role: Role): boolean {
    for (const perm of DANGEROUS_PERMISSIONS) {
        if (role.permissions.has(perm)) return true;
    }
    return false;
}

export const roleCommand = {
    name: 'role',
    description: 'Sistema seguro de gerenciamento de cargos',
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Sistema seguro de gerenciamento de cargos')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription('Dá um cargo seguro para um membro específico')
                .addUserOption(o => o.setName('user').setDescription('O membro que receberá o cargo').setRequired(true))
                .addRoleOption(o => o.setName('role').setDescription('O cargo a ser dado').setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName('all')
                .setDescription('Dá um cargo seguro para TODOS os membros do servidor')
                .addRoleOption(o => o.setName('role').setDescription('O cargo a ser dado').setRequired(true))
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        const role = interaction.options.getRole('role', true) as Role;

        // Verificações de segurança
        if (isRoleDangerous(role)) {
            return interaction.reply({
                content: '❌ **Operação Bloqueada:** Você selecionou um cargo perigoso (possui Admin, Gerenciar Servidor/Cargos/Canais ou Banir/Expulsar). Por motivos de segurança, o uso desse cargo no comando é proibido.',
                flags: MessageFlags.Ephemeral
            });
        }

        // Verificar se o cargo do bot é mais alto que o cargo selecionado
        const botMember = await interaction.guild!.members.fetch(interaction.client.user.id);
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({
                content: '❌ Meu cargo atual está abaixo do cargo que você quer distribuir. Suba meu cargo nas configurações do servidor.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (subcommand === 'add') {
            const user = interaction.options.getUser('user', true) as User;
            const member = await interaction.guild!.members.fetch(user.id).catch(() => null);

            if (!member) {
                return interaction.reply({ content: '❌ Membro não encontrado no servidor.', flags: MessageFlags.Ephemeral });
            }

            await interaction.deferReply();

            try {
                await member.roles.add(role);
                const embed = new EmbedBuilder()
                    .setColor(EMBED_COLORS.SUCCESS)
                    .setTitle('✅ Cargo Atribuído')
                    .setDescription(`O cargo ${role.toString()} foi dado com sucesso para ${member.toString()}`)
                    .setFooter({ text: EMBED_CREDIT });
                return interaction.editReply({ embeds: [embed] });
            } catch (err) {
                logger.error(`[Role] Erro ao adicionar cargo em membro individual:`, err);
                return interaction.editReply({ content: '❌ Ocorreu um erro ao adicionar o cargo ao membro.' });
            }
        }

        if (subcommand === 'all') {
            await interaction.deferReply();

            try {
                await interaction.editReply({
                    content: `⏳ Iniciando atribuição em massa do cargo ${role.toString()} para TODOS os membros. Isso pode demorar vários minutos...`
                });

                const members = await interaction.guild!.members.fetch();
                let successCount = 0;
                let failCount = 0;

                // Atribuição em lotes para evitar Rate Limits drásticos
                const arr = Array.from(members.values());
                for (let i = 0; i < arr.length; i++) {
                    const member = arr[i];
                    if (!member.user.bot && !member.roles.cache.has(role.id)) {
                        try {
                            await member.roles.add(role);
                            successCount++;
                        } catch (err) {
                            failCount++;
                        }
                    }
                    // Delay anti rate limit (1 membro a cada 1 seg)
                    await new Promise(r => setTimeout(r, 1000));
                }

                const embed = new EmbedBuilder()
                    .setColor(EMBED_COLORS.SUCCESS)
                    .setTitle('✅ Atribuição em Massa Concluída')
                    .setDescription(`O cargo ${role.toString()} foi adicionado a todos os membros possíveis.\n\n**Sucesso:** \`${successCount}\`\n**Falhas:** \`${failCount}\``)
                    .setFooter({ text: EMBED_CREDIT });

                if (interaction.channel && interaction.channel.isTextBased() && 'send' in interaction.channel) {
                    return (interaction.channel as any).send({ embeds: [embed] });
                }
                return interaction.editReply({ content: '✅ Atribuição em Massa Concluída', embeds: [embed] });
            } catch (err) {
                logger.error(`[Role] Erro ao adicionar cargo em massa:`, err);
                if (interaction.channel && interaction.channel.isTextBased() && 'send' in interaction.channel) {
                    return (interaction.channel as any).send({ content: `❌ Ocorreu um erro catastrófico durante a atribuição em massa do cargo ${role.name}.` });
                }
                return interaction.editReply({ content: `❌ Ocorreu um erro catastrófico durante a atribuição em massa do cargo ${role.name}.` });
            }
        }
    }
};
