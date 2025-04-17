import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags, Guild, User } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';

export class BlackjackCommand extends InteractionCommand {

    private activeUsers: Set<string> = new Set();

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
        const user: User | null = interaction.user;
        const guild: Guild | null = interaction.guild;
        const initalBet: number = interaction.options.getInteger('bet', true);
        let bets: number[] = [initalBet];

        if (!user) {
            console.error(`Failed to find user in ${this.name}`);
            return;
        }

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        if (bets[0] <= 0) {
            interaction.reply({ content: 'Bet must be greater than 0!', flags: MessageFlags.Ephemeral });
            return;
        }

        const userProfile = await Profile.getProfileById(user.id, guild.id);
        
        if (bets[0] > userProfile.coins) {
            interaction.reply({ content: `You don't have enough coins! You have ${userProfile.coins} coins.`, flags: MessageFlags.Ephemeral });
            return;
        }

        if (this.activeUsers.has(user.id)) {
            interaction.reply({ content: 'You already have an active game!', flags: MessageFlags.Ephemeral });
            return;
        }
    
        this.activeUsers.add(user.id);

        let gameActive = true;
        let deck = this.createDeck();
        let playerHands: string[][] = [[]];
        let activeHandIndex = 0;
        let dealerHand: string[] = [];

        playerHands[0].push(this.drawCard(deck));
        playerHands[0].push(this.drawCard(deck));
        dealerHand.push(this.drawCard(deck));
        dealerHand.push(this.drawCard(deck));

        const embed = new EmbedBuilder()
            .setTitle('Blackjack Game')
            .setColor(randomHexColour())
            .addFields(
                { name: 'Dealer\'s hand', value: `${dealerHand[0]}, ??`, inline: true },
                { name: 'Dealer\'s Total', value: `${parseInt(dealerHand[0].slice(0, -1))} + ??`, inline: true },
                { name: '\u200b', value: '\u200b' },
                { name: 'Your Hand', value: this.formatHand(playerHands[activeHandIndex]), inline: true },
                { name: 'Your Total', value: `${this.calculateHand(playerHands[activeHandIndex])}`, inline: true },
            );

        const row = this.getActionRow(playerHands, activeHandIndex, bets[activeHandIndex], userProfile.coins, playerHands.length > 1);

        if (this.calculateHand(playerHands[0]) === 21 && this.calculateHand(dealerHand) !== 21) {
            gameActive = false;

            const finalEmbed = new EmbedBuilder()
                .setTitle('Blackjack Game')
                .setDescription(`You got a blackjack! You won ${bets[activeHandIndex] * 3} coins.`)
                .setFields(
                    { name: 'Dealer\'s hand', value: this.formatHand(dealerHand), inline: true },
                    { name: 'Dealer\'s Total', value: `${this.calculateHand(dealerHand)}`, inline: true },
                    { name: '\u200b', value: '\u200b' },
                    { name: 'Your Hand', value: this.formatHand(playerHands[activeHandIndex]), inline: true },
                    { name: 'Your Total', value: `${this.calculateHand(playerHands[activeHandIndex])}`, inline: true },
                )
                .setColor('#00FF00');
            
            userProfile.coins += bets[activeHandIndex] * 2;
            await userProfile.save();

            return;
        }

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
                playerHands[activeHandIndex].push(this.drawCard(deck));
            }

            if (buttonInteraction.customId === 'doubledown') {
                playerHands[activeHandIndex].push(this.drawCard(deck));

                bets[activeHandIndex] *= 2;

                if (activeHandIndex < playerHands.length - 1) {
                    activeHandIndex++;
                } 
                else {
                    gameActive = false;
                }
            }

            if (buttonInteraction.customId === 'stand' || this.calculateHand(playerHands[activeHandIndex]) > 21) {
                if (activeHandIndex < playerHands.length - 1) {
                    activeHandIndex++;
                } 
                else {
                    gameActive = false;
                }
            }
            
            if (buttonInteraction.customId === 'split') {
            
                const currentHand = playerHands[activeHandIndex];
                if (currentHand.length !== 2 || currentHand[0].slice(0, -1) !== currentHand[1].slice(0, -1)) {
                    await buttonInteraction.reply({ content: 'You cannot split this hand!', flags: MessageFlags.Ephemeral })
                }
            
                const card1 = currentHand[0];
                const card2 = currentHand[1];
                
                playerHands[activeHandIndex] = [card1, this.drawCard(deck)];
                playerHands.push([card2, this.drawCard(deck)]);

                bets.push(bets[activeHandIndex]);
            }

            if (buttonInteraction.customId === 'surrender') {
                gameActive = false;
                bets[activeHandIndex] = Math.floor(bets[activeHandIndex] / 2);
                userProfile.coins -= bets[activeHandIndex];

                await userProfile.save();

                const playerTotal = this.calculateHand(playerHands[activeHandIndex]);
                const dealerTotal = this.calculateHand(dealerHand);

                const surrenderEmbed = new EmbedBuilder()
                    .setTitle('Blackjack Game')
                    .setColor('#FF0000')
                    .setDescription(`You surrendered! You lost half of your bet: ${bets} coins.`)
                    .setFields(
                        { name: 'Dealer\'s hand', value: this.formatHand(dealerHand), inline: true },
                        { name: 'Dealer\'s Total', value: `${dealerTotal}`, inline: true },
                        { name: '\u200b', value: '\u200b' },
                        { name: 'Your Hand', value: this.formatHand(playerHands[activeHandIndex]), inline: true },
                        { name: 'Your Total', value: `${playerTotal}`, inline: true },
                    );

                await buttonInteraction.update({ embeds: [surrenderEmbed], components: [] });

                this.activeUsers.delete(user.id);

                collector.stop();
                return;
            }

            const updatedEmbed = new EmbedBuilder()
                .setTitle('Blackjack Game')
                .setColor(randomHexColour())
                .addFields(
                    { name: 'Dealer\'s hand', value: `${dealerHand[0]}, ??`, inline: true },
                    { name: 'Dealer\'s Total', value: `${this.calculateHand([dealerHand[0]])} + ??`, inline: true },
                    { name: '\u200b', value: '\u200b' },
                    { name: 'Your Hand', value: this.formatHand(playerHands[activeHandIndex]), inline: true },
                    { name: 'Your Total', value: `${this.calculateHand(playerHands[activeHandIndex])}`, inline: true },
                )
                .setFooter({ text: `Bet${playerHands.length > 1 ? 's' : ''}: ${bets.join(', ')} coins ${playerHands.length > 1 ? `| Hand ${activeHandIndex + 1}/${playerHands.length}` : '' } ` });


            if (!gameActive) {
                while (this.calculateHand(dealerHand) < 17 && (this.calculateHand(dealerHand) < this.calculateHand(playerHands[0]) || playerHands.length > 1)) {
                    dealerHand.push(this.drawCard(deck));
                }
                const dealerTotal = this.calculateHand(dealerHand);
            
                let results: string[] = [];
                let totalWin = 0;
            
                for (let i = 0; i < playerHands.length; i++) {
                    const playerTotal = this.calculateHand(playerHands[i]);
                    let result = `Hand ${i + 1}: `;
                    if (playerTotal > 21) {
                        result += `Busted! Lost ${bets[i]} coins.`;
                        userProfile.coins -= bets[i];
                    } else if (dealerTotal > 21) {
                        result += `Dealer busted! Won ${bets[i]} coins.`;
                        userProfile.coins += bets[i];
                        totalWin += bets[i];
                    } else if (playerTotal > dealerTotal) {
                        result += `Won ${bets[i]} coins.`;
                        userProfile.coins += bets[i];
                        totalWin += bets[i];
                    } else if (playerTotal < dealerTotal) {
                        result += `Lost ${bets[i]} coins.`;
                        userProfile.coins -= bets[i];
                    } else {
                        result += `Push. Bet returned.`;
                    }
                    results.push(result);
                }
            
                const finalEmbed = new EmbedBuilder()
                    .setTitle('Blackjack Game')
                    .setFields(
                        { name: 'Dealer\'s hand', value: this.formatHand(dealerHand), inline: true },
                        { name: 'Dealer\'s Total', value: `${dealerTotal}`, inline: true },
                        { name: '\u200b', value: '\u200b' },
                        { name: 'Your Hands', value: playerHands.map((hand, index) => `Hand ${index + 1}: ${this.formatHand(hand)} (${this.calculateHand(hand)})`).join('\n'), inline: true },
                    )
                    .setDescription(results.join('\n'))
                    .setColor(totalWin > 0 ? '#00FF00' : '#FF0000');
            
                await buttonInteraction.update({ embeds: [finalEmbed], components: [] });
                await userProfile.save();
            
                this.activeUsers.delete(user.id);
                collector.stop();
                return;
            }
            else {
                await buttonInteraction.update({ embeds: [updatedEmbed], components: [this.getActionRow(playerHands, activeHandIndex, bets[activeHandIndex], userProfile.coins, playerHands.length > 1)] });
            }
        });

        collector.on('end', async () => {
            if (gameActive) {
                this.activeUsers.delete(user.id);
                await interaction.editReply({ content: 'The game has ended due to inactivity, you lose all of your money and bets.', components: [] });
                
                bets.forEach(bet => {
                    userProfile.coins -= bet;
                });

                await userProfile.save();
                return;
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
            } 
            else if (value === 'A') {
                total += 11;
                aces++;
            } 
            else {
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

    private getActionRow(playerHands: string[][], playerHandIndex: number, bet: number, coins: number, split: boolean): ActionRowBuilder<ButtonBuilder> {
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

        if (playerHands[playerHandIndex].length === 2) {
            
            const cards = playerHands[playerHandIndex].map(card => card.slice(0, -1));

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('doubledown')
                    .setLabel('Double Down')
                    .setDisabled(coins < bet * 2)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('split')
                    .setLabel('Split')
                    .setDisabled(cards[0] !== cards[1] || coins < bet * (playerHands.length + 1))
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('surrender')
                    .setLabel('Surrender')
                    .setDisabled(playerHands.length > 1)
                    .setStyle(ButtonStyle.Danger),
            );
        }

        return row;
    }
}

export default new BlackjackCommand();