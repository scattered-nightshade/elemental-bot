import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour, randomIntInRange } from '../../../modules/random';

export class MonthlyCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'monthly';
        this.description = 'Receive your money every 30 days';
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
        const lastMonthlyGotten = userProfile.cooldowns.monthlyGotten;

        const timeDiff = now.getTime() - new Date(lastMonthlyGotten).getTime();

        if (!lastMonthlyGotten || timeDiff >= 30 * 24 * 60 * 60 * 1000) {
            const coinsGotten = randomIntInRange(500, 2000)
            userProfile.coins += coinsGotten;
            userProfile.cooldowns.monthlyGotten = new Date();

            await userProfile.save();

            const embed = new EmbedBuilder()
                .setTitle('Monthly Reward')
                .setDescription(`${user.displayName} has just received ${coinsGotten} coins from their monthly reward`)
                .setColor(randomHexColour());

            interaction.reply({ embeds: [embed] });
        } else {
            const timeRemaining = Math.ceil((30 * 24 * 60 * 60 * 1000 - timeDiff) / 1000);
            interaction.reply({ content: `Monthly reward is not ready yet. Time remaining: <t:${Math.floor((now.getTime() + timeRemaining * 1000) / 1000)}:R>`, flags: MessageFlags.Ephemeral });
        }
    }
}

export default new MonthlyCommand();