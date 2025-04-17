import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';

export class BlackjackCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'blackjack';
        this.description = 'Play a game of blackjack!';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .addIntegerOption(option => option.setName('bet').setDescription('The amount of coins to bet').setRequired(true));
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const user = interaction.user;
        const guild = interaction.guild;
        let bet = interaction.options.getInteger('bet', true);

        if (!user) {
            console.error(`Failed to find user in ${this.name}`);
            return;
        }

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const userProfile = await Profile.getProfileById(user.id, guild.id);


        let gameActive = true;
        let deck = this.createDeck();
        let playerHand: string[] = [];
        let dealerHand: string[] = [];

        playerHand.push(this.drawCard(deck));
        playerHand.push(this.drawCard(deck));
        dealerHand.push(this.drawCard(deck));
        dealerHand.push(this.drawCard(deck));

        const embed = new EmbedBuilder()
            .setTitle('Blackjack Game')
            .setColor(randomHexColour())
            .addFields(
                { name: 'Dealer\'s hand', value: `${dealerHand[0]}, ??`, inline: true },
                { name: 'Dealer\'s Total', value: `${this.calculateHand(dealerHand)}`, inline: true },
                { name: '\u200b', value: '\u200b' },
                { name: 'Your Hand', value: this.formatHand(playerHand), inline: true },
                { name: 'Your Total', value: `${this.calculateHand(playerHand)}`, inline: true },
            );

        const row = this.getActionRow(playerHand, bet, userProfile.coins);


        const response = await interaction.reply({ embeds: [embed], components: [row], withResponse: true });

        const resource = response.resource;

        if (!resource) {
            console.error('Failed to get resource from interaction reply.');
            return;
        }

        const message = resource.message;

        if (!message) {
            console.error('Failed to get message from interaction reply.');
            return;
        }

        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 90 * 1000 });

        collector.on('collect', async buttonInteraction => {
            if (buttonInteraction.user.id != user.id) {
                await buttonInteraction.reply({ content: 'This is not your game!', flags: MessageFlags.Ephemeral });
                return;
            }

            collector.resetTimer();

            if (buttonInteraction.customId === 'hit') {
                playerHand.push(this.drawCard(deck));
                    
                if (this.calculateHand(playerHand) > 21) {
                    gameActive = false;
                }
            }

            if (buttonInteraction.customId === 'stand') {
                gameActive = false;
            }

            if (buttonInteraction.customId === 'split') {
                // Split
            }

            if (buttonInteraction.customId === 'doubledown') {
                playerHand.push(this.drawCard(deck));

                bet *= 2;

                gameActive = false;
            }

            if (buttonInteraction.customId === 'surrender') {
                gameActive = false;
                bet = Math.floor(bet / 2);
                userProfile.coins -= bet;

                await userProfile.save();

                const playerTotal = this.calculateHand(playerHand);
                const dealerTotal = this.calculateHand(dealerHand);

                const surrenderEmbed = new EmbedBuilder()
                    .setTitle('Blackjack Game')
                    .setColor('#FF0000')
                    .setDescription(`You surrendered! You lost half of your bet: ${bet} coins.`)
                    .setFields(
                        { name: 'Dealer\'s hand', value: this.formatHand(dealerHand), inline: true },
                        { name: 'Dealer\'s Total', value: `${dealerTotal}`, inline: true },
                        { name: '\u200b', value: '\u200b' },
                        { name: 'Your Hand', value: this.formatHand(playerHand), inline: true },
                        { name: 'Your Total', value: `${playerTotal}`, inline: true },
                    );

                await buttonInteraction.update({ embeds: [surrenderEmbed], components: [] });

                collector.stop();
                return;
            }

            const updatedEmbed = new EmbedBuilder()
                .setTitle('Blackjack Game')
                .setColor(randomHexColour())
                .addFields(
                    { name: 'Dealer\'s hand', value: `${dealerHand[0]}, ??`, inline: true },
                    { name: 'Dealer\'s Total', value: `${this.calculateHand(dealerHand)}`, inline: true },
                    { name: '\u200b', value: '\u200b' },
                    { name: 'Your Hand', value: this.formatHand(playerHand), inline: true },
                    { name: 'Your Total', value: `${this.calculateHand(playerHand)}`, inline: true },
                );


            if (!gameActive) {
                while (this.calculateHand(dealerHand) < 17) {
                    dealerHand.push(this.drawCard(deck));
                }
                const playerTotal = this.calculateHand(playerHand);
                const dealerTotal = this.calculateHand(dealerHand);

                const finalEmbed = new EmbedBuilder()
                    .setTitle('Blackjack Game')
                    .setFields(
                        { name: 'Dealer\'s hand', value: this.formatHand(dealerHand), inline: true },
                        { name: 'Dealer\'s Total', value: `${dealerTotal}`, inline: true },
                        { name: '\u200b', value: '\u200b' },
                        { name: 'Your Hand', value: this.formatHand(playerHand), inline: true },
                        { name: 'Your Total', value: `${playerTotal}`, inline: true },
                    );

                if (playerTotal > 21) {
                    finalEmbed.setDescription(`You busted! Dealer wins! You lost ${bet} coins.`);
                    finalEmbed.setColor('#FF0000');
                    userProfile.coins -= bet;
                }
                else if (dealerTotal > playerTotal && dealerTotal <= 21) {
                    finalEmbed.setDescription(`Dealer wins! you lost ${bet} coins.`);
                    finalEmbed.setColor('#FF0000');
                    userProfile.coins -= bet;
                }
                else if (dealerTotal > 21 && playerTotal <= 21) {
                    finalEmbed.setDescription(`Dealer busted! You win! You won ${bet} coins.`);
                    finalEmbed.setColor('#00FF00');
                    userProfile.coins += bet;
                }
                else if (playerTotal > dealerTotal) {
                    finalEmbed.setDescription(`You win! You won ${bet} coins.`);
                    finalEmbed.setColor('#00FF00');
                    userProfile.coins += bet;
                }
                else if (playerTotal === dealerTotal) {
                    finalEmbed.setDescription(`It\`s a tie! You get your bet back.`);
                    finalEmbed.setColor('#FFFF00');
                }
                else {
                    finalEmbed.setDescription(`Dealer wins! You lost ${bet} coins.`);
                    finalEmbed.setColor('#FF0000');
                    userProfile.coins -= bet;
                }

                await buttonInteraction.update({ embeds: [finalEmbed], components: [] });
                await userProfile.save();

                collector.stop();
                return;
            }
            else {
                await buttonInteraction.update({ embeds: [updatedEmbed], components: [this.getActionRow(playerHand, bet, userProfile.coins)] });
            }
        });

        collector.on('end', async () => {
            if (gameActive) {
                await interaction.editReply({ content: 'The game has ended due to inactivity.', components: [] });
            }
        });
    }

    private createDeck(): string[] {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        const loops = 6;

        const deck: string[] = [];
        for (let i = 0; i < loops; i++) {
            for (const suit of suits) {
                for (const value of values) {
                    deck.push(`${value}${suit}`);
                }
            }
        }

        return deck.sort(() => Math.random() - 0.5);
    }

    private drawCard(deck: string[]): string {
        return deck.pop()!;
    }

    private calculateHand(hand: string[]): number {
        let total = 0;
        let aces = 0;

        for (const card of hand) {
            const value = card.slice(0, -1);
            if (['J', 'Q', 'K'].includes(value)) {
                total += 10;
            } else if (value === 'A') {
                total += 11;
                aces++;
            } else {
                total += parseInt(value);
            }
        }

        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }

        return total;
    }

    private formatHand(hand: string[]): string {
        return hand.join(', ');
    }

    private getActionRow(playerHand: string[], bet: number, coins: number): ActionRowBuilder<ButtonBuilder> {
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('hit')
                    .setLabel('Hit')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('stand')
                    .setLabel('Stand')
                    .setStyle(ButtonStyle.Primary),
                    
            );

        if (playerHand.length === 2) {
            const cards = playerHand.map(card => card.slice(0, -1));
            if (cards[0] === cards[1]) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('split')
                        .setLabel('Split')
                        .setDisabled(true)
                        .setStyle(ButtonStyle.Primary),
                );
            }


            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('doubledown')
                    .setLabel('Double Down')
                    .setDisabled(coins < bet * 2)
                    .setStyle(ButtonStyle.Primary),
                
            
                new ButtonBuilder()
                    .setCustomId('surrender')
                    .setLabel('Surrender')
                    .setStyle(ButtonStyle.Danger),
            );
        }

        return row;
    }
}

export default new BlackjackCommand();