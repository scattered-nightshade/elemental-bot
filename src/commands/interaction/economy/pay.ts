import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';

export class PayCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'pay';
        this.description = 'Pay someone else some of your coins.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .addIntegerOption(option => option.setName('amount').setDescription('How much to pay').setRequired(true))
            .addUserOption(option => option.setName('member').setDescription('The member to pay.').setRequired(true));
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const user = interaction.user;
        const targetUser = interaction.options.getUser('member', true);
        const amountToPay = interaction.options.getInteger('amount', true);
        const guild = interaction.guild;

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const userProfile = await Profile.getProfileById(user.id, guild.id);
        const targetProfile = await Profile.getProfileById(targetUser.id, guild.id);

        if (0 >= amountToPay) {
            interaction.reply({ content: 'Invalid value supplied', flags: MessageFlags.Ephemeral });
        }

        if (amountToPay > userProfile.coins) {
            interaction.reply({ content: 'You dont have enough coins to pay your target', flags: MessageFlags.Ephemeral });
        }

        userProfile.coins -= amountToPay;
        targetProfile.coins += amountToPay;

        userProfile.save();
        targetProfile.save();

        const embed = new EmbedBuilder()
            .setTitle(`Payment to <@${targetUser.id}>`)
            .setDescription(`You have just paid <@${targetUser.id}> ${amountToPay} coins, you now have ${userProfile.coins} coins`)
            .setColor(randomHexColour());
        
        interaction.reply({ embeds: [embed] })
    }
}

export default new PayCommand();