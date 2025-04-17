import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour, randomIntInRange } from '../../../modules/random';

export class DailyCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'daily';
        this.description = 'Receive your money every 24hrs';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw);
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const user = interaction.user;
        const guild = interaction.guild;

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const userProfile = await Profile.getProfileById(user.id, guild.id);

        const now = new Date();
        const lastDailyGotten = userProfile.cooldowns.dailyGotten;

        const timeDiff = now.getTime() - new Date(lastDailyGotten).getTime()

        if (!lastDailyGotten ||  timeDiff < 24 * 60 * 60 * 1000) {
            const coinsGotten = randomIntInRange(6, 36)
            userProfile.coins += coinsGotten;
            userProfile.cooldowns.dailyGotten = new Date();
    
            userProfile.save();
    
            const embed = new EmbedBuilder()
                .setTitle('Daily')
                .setDescription(`${user.displayName} has just received ${coinsGotten} coins from their daily reward`)
                .setColor(randomHexColour())
            
            interaction.reply({ embeds: [embed] })
        }
        else {
            const timeRemaining = Math.ceil((24 * 60 * 60 * 1000 - timeDiff) / 1000);
            interaction.reply({ content: `Daily is not ready yet, time remaining: <t:${timeRemaining}:R>`, flags: MessageFlags.Ephemeral })
        }
    }
}

export default new DailyCommand();