import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder, PermissionsBitField, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';

export class ModifyXPCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'modifyxp';
        this.description = 'Modify your\'s or someone else\'s xp.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .setDefaultMemberPermissions(PermissionsBitField.All)
            .addStringOption(option =>
                option.setName('option')
                .setDescription('Modification option')
                .setRequired(true)
                .addChoices(
                    { name: 'Add', value: 'add' },
                    { name: 'Remove', value: 'remove' },
                    { name: 'Set', value: 'set' }
                )
            )
            .addIntegerOption(option => option.setName('amount').setDescription('The amount to modify the xp by.').setRequired(true))
            .addUserOption(option => option.setName('member').setDescription('The member to modify the xp of.').setRequired(false));
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const user = interaction.options.getUser('member') || interaction.user;
        const guild = interaction.guild;
        const option = interaction.options.getString('option', true);
        const amount = interaction.options.getInteger('amount', true);

        if (!user) {
            console.error(`Failed to find user in ${this.name}`);
            return;
        }

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const userProfile = await Profile.getProfileById(user.id, guild.id);

        let newXP = userProfile.xp || 0;

        switch (option) {
            case 'add':
                newXP += amount;
                break;
            case 'remove':
                newXP -= amount;
                if (newXP < 0) newXP = 0;
                break;
            case 'set':
                newXP = amount;
                break;
            default:
                interaction.reply({ content: 'Invalid modification option.', flags: MessageFlags.Ephemeral });
                return;
        }

        userProfile.xp = newXP;
        await userProfile.save();

        const embed = new EmbedBuilder()
            .setTitle('XP Modified')
            .setDescription(`Successfully updated ${user.username}'s XP to **${newXP}**.`)
            .setColor(randomHexColour());

        interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

export default new ModifyXPCommand();