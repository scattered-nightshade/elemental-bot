import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';

export class CoinFlipCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'coinflip';
        this.description = 'Gamble on a heads or tails';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .addIntegerOption(option => option.setName('bet').setDescription('How much you want to bet').setRequired(true))
            .addStringOption(option =>
                option.setName('coin')
                    .setDescription('The side of the coin')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Heads', value: 'heads' },
                        { name: 'Tails', value: 'tails' }
                    )
            )
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const user = interaction.options.getUser('member') || interaction.user;
        const guild = interaction.guild;

        const amount: number = interaction.options.getInteger('bet', true);
        const choice: string = interaction.options.getString('coin', true);

        if (!user) {
            console.error(`Failed to find user in ${this.name}`);
            return;
        }

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const userProfile = await Profile.getProfileById(user.id, guild.id);

        if (amount <= 0) {
            interaction.reply({ content: 'The amount must be greater than 0', flags: MessageFlags.Ephemeral });
        }

        if (userProfile.coins < amount) {
            interaction.reply({ content: 'The amount that you are gambling is higher than how much you have', flags: MessageFlags.Ephemeral });
        }

        const preflipCoins = userProfile.coins;

        const embedWin = new EmbedBuilder()
            .setTitle(`It\'s **${choice}**! You win!`)
            .setDescription(`You earnt ${amount} coins and now have ${preflipCoins + amount} coins`)
            .setColor(randomHexColour())

        const embedLoss = new EmbedBuilder()
            .setTitle(`It\'s ${(choice == 'heads' ? 'tails' : 'heads')}... You lose.`)
            .setDescription(`You lost ${amount} coins and now have ${preflipCoins - amount} coins`)
            .setColor(randomHexColour())


        const flipChance = Math.random() > 0.5
        const winConditions = (flipChance && choice == 'heads') || (!flipChance && choice == 'tails')

        if (winConditions) {
            userProfile.coins += amount;
            interaction.reply({ embeds: [embedWin] })
        }
        else {
            userProfile.coins -= amount;
            interaction.reply({ embeds: [embedLoss] })
        }

        userProfile.save();        
    }
}

export default new CoinFlipCommand();