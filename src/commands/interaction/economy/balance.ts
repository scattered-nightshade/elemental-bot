import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';

export class BalanceCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'balance';
        this.description = 'Check your\'s or someone else\'s balance.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .addUserOption(option => option.setName('member').setDescription('The member to check the balance of.').setRequired(false));
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const user = interaction.options.getUser('member') || interaction.user;
        const guild = interaction.guild;

        if (!user) {
            console.error(`Failed to find user in ${this.name}`);
            return;
        }

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const userProfile = await Profile.getProfileById(user.id, guild.id);

        const embed = new EmbedBuilder()
            .setTitle('Balance')
            .setDescription(`${user.displayName} has ${userProfile.coins} coins`)
            .setColor(randomHexColour())
        
        interaction.reply({ embeds: [embed] })
    }
}

export default new BalanceCommand();