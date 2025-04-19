import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';
import Guild from '../../../schemas/guildModel';

export class SettingsCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'settings';
        this.description = 'Change some settings for this bot';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommandGroup(group => group
                .setName('levels')
                .setDescription('All commands related to levelling and xp.')
                .addSubcommand(subcommand => subcommand
                    .setName('enabled')
                    .setDescription('Enable or disable levelling and XP')
                    .addBooleanOption(option => option.setName('levels-toggle').setDescription('Enable or disable levelling and XP').setRequired(true))
                )
                .addSubcommand(subcommand => subcommand
                    .setName('award-roles')
                    .setDescription('Award roles when user gets to a level')
                    .addRoleOption(option => option.setName('levels-award-role').setDescription('Role to award at required level').setRequired(true))
                    .addIntegerOption(option => option.setName('levels-award-level').setDescription('Level to award this role at').setRequired(true))
                )

            );
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
            return;
        }

        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (subcommandGroup === 'levels') {
            if (subcommand === 'enabled') {
                const enabled = interaction.options.getBoolean('levels-toggle', true);
                await Guild.updateGuild(interaction.guildId, { levelsEnabled: enabled });

                const embed = new EmbedBuilder()
                    .setTitle('Levels Setting Updated')
                    .setDescription(`Levelling and XP are now **${enabled ? 'enabled' : 'disabled'}**.`)
                    .setColor(randomHexColour());

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }

            if (subcommand === 'award-roles') {
                const role = interaction.options.getRole('levels-award-role', true);
                const level = interaction.options.getInteger('levels-award-level', true);

                const guildData = await Guild.getGuildById(interaction.guildId);
                const awardRoles = guildData.levelAwardRoles || [];
                const existingIndex = awardRoles.findIndex(r => r.level === level);

                if (existingIndex !== -1) {
                    awardRoles[existingIndex].roleID = role.id;
                } else {
                    awardRoles.push({ roleID: role.id, level });
                }

                await Guild.updateGuild(interaction.guildId, { levelAwardRoles: awardRoles });

                const embed = new EmbedBuilder()
                    .setTitle('Level Award Role Updated')
                    .setDescription(`Role <@&${role.id}> will now be awarded at level **${level}**.`)
                    .setColor(randomHexColour());

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }
        }

        await interaction.reply({ content: 'Invalid subcommand.', flags: MessageFlags.Ephemeral });
    }
}

export default new SettingsCommand();