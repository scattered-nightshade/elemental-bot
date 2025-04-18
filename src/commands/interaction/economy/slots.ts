import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ComponentType, GuildTextBasedChannel } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour, weightedRandom } from '../../../modules/random';

export class SlotsCommand extends InteractionCommand {

    private activeUsers: Set<string> = new Set();

    constructor() {
        super();
        this.name = 'slots';
        this.description = 'Play some slots.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw);
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const user = interaction.user;
        const guild = interaction.guild;
        let bet = 1000
        const maxBet = 50000

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        if (this.activeUsers.has(user.id)) {
            interaction.reply({ content: 'You already have an active game!', flags: MessageFlags.Ephemeral });
            return;
        }
    
        this.activeUsers.add(user.id);
        let gameActive = true;
        let sessionWinnings = 0;

        const userProfile = await Profile.getProfileById(user.id, guild.id);

        const symbolValues = {
            "🍒": 3,
            "🍋": 4, 
            "🍊": 5, 
            "🍉": 8, 
            "🔔": 12, 
            "⭐": 15, 
            "7️⃣": 50,
        }
        const symbols = ["🍒", "🍋", "🍊", "🍉", "🔔", "⭐", "7️⃣"];
        const weights = [45, 35, 30, 20, 10, 5, 1];

        let reel1 = ["🎰", "", "🎰"];
        let reel2 = ["🎰", "**Spin 2 Win**", "🎰"];
        let reel3 = ["🎰", "", "🎰"];

        const payoutsString = `🍒🍒 - ${symbolValues['🍒'] - 1.5}x\n🍒🍒🍒 - ${symbolValues['🍒']}x\n🍋🍋🍋 - ${symbolValues['🍋']}x\n🍊🍊🍊 - ${symbolValues['🍊']}x\n🍉🍉🍉 - ${symbolValues['🍉']}x\n🔔🔔🔔 - ${symbolValues['🔔']}\n⭐⭐⭐ - ${symbolValues['⭐']}x\n7️⃣7️⃣7️⃣ - ${symbolValues['7️⃣']}`;

        const payoutsEmbed = new EmbedBuilder()
            .setTitle('Payouts')
            .setDescription(payoutsString);


        const embed = new EmbedBuilder()
            .setTitle('Slots')
            .setDescription('**Spin 2 Win**')
            .setFooter({ text: `Current Bet: ${bet}, Max Bet: ${maxBet}`}); 

        const response = await interaction.reply({ embeds: [embed], components: this.getActionRow(userProfile, bet, maxBet), withResponse: true });

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

            let totalPayout = 0;
            let wins: {
                type: "big" | "small";
                symbol: string;
                line: string;
                payoutMultiplier: number;
            }[] = [];

            if (buttonInteraction.customId === 'spin') {

                let loseBias = Math.random() < 0.4;

                if (loseBias) {
                    let tries = 0;                    
                    do {
                        reel1 = weightedRandom(symbols, weights, { returnAmount: 3 });
                        reel2 = weightedRandom(symbols, weights, { returnAmount: 3 });
                        reel3 = weightedRandom(symbols, weights, { returnAmount: 3 });

                        wins = this.figureOutWinConditions(reel1, reel2, reel3, symbolValues);

                        tries++;
                        if (tries > 10) break;
                    } while (wins.length > 0);
                }
                else {
                    reel1 = weightedRandom(symbols, weights, { returnAmount: 3 });  
                    reel2 = weightedRandom(symbols, weights, { returnAmount: 3 });
                    reel3 = weightedRandom(symbols, weights, { returnAmount: 3 });
                }

                wins = this.figureOutWinConditions(reel1, reel2, reel3, symbolValues);

                for (const win of wins) {
                    totalPayout += bet * win.payoutMultiplier;
                }

                userProfile.coins += Math.floor(totalPayout - bet);
                sessionWinnings += Math.floor(totalPayout - bet);
                userProfile.save();
            }

            while (userProfile.coins < bet) {
                bet -= 1000;
            }


            if (buttonInteraction.customId == 'stop' || userProfile.coins < 1000) {
                gameActive = false;
            }

            if (buttonInteraction.customId === 'increasebet') {
                bet += 1000;
            }

            if (buttonInteraction.customId === 'decreasebet') {
                bet -= 1000;
            }

            if (buttonInteraction.customId === 'maxbet') {
                bet = maxBet;
            }

            if (buttonInteraction.customId === 'payouts') {
                (interaction.channel as GuildTextBasedChannel).send({ embeds: [payoutsEmbed], content: `<@${buttonInteraction.user.id}>` });
            }


            const winString = wins.map(win => {
                if (win.type === 'big') {
                    return `**${win.symbol} ${win.symbol} ${win.symbol}** - **${win.payoutMultiplier}x** on ${win.line}`;
                } else {
                    return `${win.symbol} ${win.symbol} - **${win.payoutMultiplier}x** on ${win.line}`;
                }
            });

            const updatedEmbed = new EmbedBuilder()
                .setTitle('Slots')
                .setDescription(this.formatSlots(reel1, reel2, reel3))
                .setFooter({ text: `Current Balance: ${userProfile.coins} | Current Bet: ${bet} | Max Bet: ${maxBet}`});

            if (wins.length > 0) {
                updatedEmbed.addFields({ name: 'Winnings', value: `You won **${totalPayout} coins!**\n ${winString.join('\n')}`, inline: false });
            }

            if (!gameActive){
                buttonInteraction.update({ content: `You have stopped playing. You won a total of **${sessionWinnings} coins!**`, embeds: [], components: [] });
                this.activeUsers.delete(user.id);

                collector.stop();
                return;
            }
            else {

                await buttonInteraction.update({ embeds: [updatedEmbed], components: this.getActionRow(userProfile, bet, maxBet) });
            }
        });

        collector.on('end', async () => {
            if (gameActive) {
                this.activeUsers.delete(user.id);
                await interaction.editReply({ content: 'The game has ended due to inactivity.', components: [] });
                return;
            }
        });

    }

    private getActionRow(userProfile: Profile, currentBet: number, maxBet: number): ActionRowBuilder<ButtonBuilder>[] {
        const row1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spin')
                    .setLabel('Spin')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('stop')
                    .setLabel('Stop Playing')
                    .setStyle(ButtonStyle.Danger)
            );

        const row2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('increasebet')
                    .setLabel('Increase Bet')
                    .setDisabled(userProfile.coins < currentBet + 1000 || currentBet + 1000 > maxBet)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('decreasebet')
                    .setLabel('Decrease Bet')
                    .setDisabled(currentBet - 1000 < 1000)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('maxbet')
                    .setLabel('Max Bet')
                    .setDisabled(currentBet == maxBet || userProfile.coins < maxBet)
                    .setStyle(ButtonStyle.Primary),
            );

        const row3 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('payouts')
                    .setLabel('View Payouts')
                    .setStyle(ButtonStyle.Secondary)
            );


        return [row1, row2, row3];
    }

    private figureOutWinConditions(reel1: string[], reel2: string[], reel3: string[], symbolValues: Record<string, number>) {
        const wins: { type: "big" | "small", symbol: string, line: string, payoutMultiplier: number }[] = [];
    
        const rows = [
            { name: "row1", symbols: [reel1[0], reel2[0], reel3[0]] },
            { name: "row2", symbols: [reel1[1], reel2[1], reel3[1]] },
            { name: "row3", symbols: [reel1[2], reel2[2], reel3[2]] },
        ];
    
        for (const { name, symbols } of rows) {
            const [first, second, third] = symbols;
            if (first === second && second === third) {
                wins.push({ type: "big", symbol: first, line: name, payoutMultiplier: symbolValues[first] });
            } 
            else {
                const cherryCount = symbols.filter(symbol => symbol === "🍒").length;
                if (cherryCount >= 2) {
                    wins.push({ type: "small", symbol: "🍒", line: name, payoutMultiplier: 1.5 });
                }
            }
        }
    
        /* Removed this because people were winning a bit... too much
        const downwardDiagonal = [reel1[0], reel2[1], reel3[2]];
        const upwardDiagonal = [reel1[2], reel2[1], reel3[0]];
    
        const diagonals = [
            { name: "diagonalDown", symbols: downwardDiagonal },
            { name: "diagonalUp", symbols: upwardDiagonal },
        ];
    
        for (const { name, symbols } of diagonals) {
            const [first, second, third] = symbols;
            if (first === second && second === third) {
                wins.push({ type: "big", symbol: first, line: name, payoutMultiplier: symbolValues[first] });
            } 
            else {
                const cherryCount = symbols.filter(symbol => symbol === "🍒").length;
                if (cherryCount >= 2) {
                    wins.push({ type: "small", symbol: "🍒", line: name, payoutMultiplier: 1.5 });
                }
            }
        }
        */

        return wins;
    }

    

    private formatSlots(reel1: string[], reel2: string[], reel3: string[]): string {
        let rows = [];
        for (let i = 0; i < 3; i++) {
            rows.push(`${reel1[i]} ${reel2[i]} ${reel3[i]}`);
        }
        return rows.join('\n');
    }
}

export default new SlotsCommand();