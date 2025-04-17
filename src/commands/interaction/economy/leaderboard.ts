import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';

export class LeaderboardCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'leaderboard';
        this.description = 'Check your\'s or someone else\'s balance.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw);
        }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const guild = interaction.guild;

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const guildProfiles = await Profile.getProfilesByGuild(guild.id);

        const topProfiles = guildProfiles.sort((a, b) => b.coins - a.coins).slice(0, 10);

        const leaderboard = topProfiles.map((profile, index) => `#${index + 1} <@${profile.userID}> - ${profile.coins} coins`).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('Leaderboard')
            .setDescription(leaderboard || 'No leaderboard data available')
            .setColor(randomHexColour());
        
        interaction.reply({ embeds: [embed] });
    }
}

export default new LeaderboardCommand();