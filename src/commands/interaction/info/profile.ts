import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';
import Guild from '../../../schemas/guildModel';

export class ProfileCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'profile';
        this.description = 'Check your\'s or someone else\'s profile.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .addUserOption(option => option.setName('member').setDescription('The member to check the profile of.').setRequired(false));
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
        const guildData = await Guild.getGuildById(guild.id);

        const member = guild.members.cache.get(user.id);

        const embed = new EmbedBuilder()
            .setTitle(`${userProfile.userID}'s Profile`)
            .addFields(
                { name: 'Coins', value: `${userProfile.coins}`},
            )
            .setColor(randomHexColour());

        if (guildData.levelsEnabled) {
            embed.addFields(
                { name: 'XP', value: `${userProfile.xp}/${Profile.xpToNextLevel(userProfile.level)}`},
                { name: 'Level', value: `${userProfile.level}`},
            )
        }
        if (member) {
            embed.setTitle(`${member.displayName}'s Profile`)
                .setThumbnail(member.displayAvatarURL());
            
        }
        
        interaction.reply({ embeds: [embed] })
    }
}

export default new ProfileCommand();