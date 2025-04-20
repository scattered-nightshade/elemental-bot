import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile, { IProfile } from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';

interface RouletteGame {
    guildId: string;
    channelId: string;
    startedBy: string;
    bets: {
        userId: string;
        bet: string | number;
        amount: number;
    }[];
    timeout: NodeJS.Timeout;
}


export class RouletteCommand extends InteractionCommand {

    colors = {
        red: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],
        black: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35],
        green: [0],
    };

    activeGames: Map<string, RouletteGame> = new Map<string, RouletteGame>();

    constructor() {
        super();
        this.name = 'roulette';
        this.description = 'Play roulette.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .addStringOption(option => option.setName('space').setDescription('The space(s) to bet on.').setRequired(true))
            .addIntegerOption(option => option.setName('amount').setDescription('The amount to bet.').setRequired(true));
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const user = interaction.user;
        const guild = interaction.guild;
        const spacePreFilter = interaction.options.getString('space', true).toLowerCase();
        const amount = interaction.options.getInteger('amount', true);

        const redStringFilter = ['red', 'reds', 'r'];
        const blackStringFilter = ['black', 'blacks', 'b'];
        const oddStringFilter = ['odd', 'odds', 'o'];
        const evenStringFilter = ['even', 'evens', 'e'];
        const highStringFilter = ['high', 'hi', 'h'];
        const lowStringFilter = ['low', 'lo', 'l'];
        const dozen1StringFilter = ['dozen1', 'first dozen', '1st', '1-12'];
        const dozen2StringFilter = ['dozen2', 'second dozen', '2nd', '13-24'];
        const dozen3StringFilter = ['dozen3', 'third dozen', '3rd', '25-36'];

        let space;

        if (redStringFilter.includes(spacePreFilter)) {
            space = 'red';
        } 
        else if (blackStringFilter.includes(spacePreFilter)) {
            space = 'black';
        } 
        else if (oddStringFilter.includes(spacePreFilter)) {
            space = 'odd';
        } 
        else if (evenStringFilter.includes(spacePreFilter)) {
            space = 'even';
        } 
        else if (highStringFilter.includes(spacePreFilter)) {
            space = 'high';
        } 
        else if (lowStringFilter.includes(spacePreFilter)) {
            space = 'low';
        } 
        else if (dozen1StringFilter.includes(spacePreFilter)) {
            space = 'dozen1';
        } 
        else if (dozen2StringFilter.includes(spacePreFilter)) {
            space = 'dozen2';
        } 
        else if (dozen3StringFilter.includes(spacePreFilter)) {
            space = 'dozen3';
        } 
        else if (!isNaN(parseInt(spacePreFilter))) {
            const number = parseInt(spacePreFilter);
            if (number >= 0 && number <= 36) {
                space = number;
            } 
            else {
                interaction.reply({ content: 'Invalid number space! Must be between 0 and 36.', flags: MessageFlags.Ephemeral });
                return;
            }
        } else {
            interaction.reply({ content: 'Invalid bet space.', flags: MessageFlags.Ephemeral });
            return;
        }


        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const userProfile: IProfile = await Profile.getProfileById(user.id, guild.id);


        if (amount <= 0) {
            interaction.reply({ content: 'You must bet a positive amount.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (userProfile.coins < amount) {
            interaction.reply({ content: 'You do not have enough coins to place this bet.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (this.activeGames.has(interaction.channelId)) {
            const currentGame = this.activeGames.get(interaction.channelId);
            if (!currentGame) {
                interaction.reply({ content: 'Failed to find current game.', flags: MessageFlags.Ephemeral });
                return;
            }

            currentGame.bets.push({
                userId: user.id,
                bet: space,
                amount: amount,
            });

            userProfile.coins -= amount;
            await userProfile.save();

            await interaction.reply({ content: `You have bet ${amount} on ${space}. Good luck!` });
        }
        else {

            const time = 60;

            const newGame: RouletteGame = {
                guildId: guild.id,
                channelId: interaction.channelId,
                startedBy: user.id,
                bets: [
                    {
                        userId: user.id,
                        bet: space,
                        amount: amount,
                    },
                ],
                timeout: setTimeout(() => {
                    this.endGame(interaction);
                }, time * 1000),
            };

            this.activeGames.set(interaction.channelId, newGame);

            const embed = new EmbedBuilder()
                .setTitle('Roulette Game Started')
                .setDescription(`A new roulette game has started! Bet on a space using \`/roulette\` command. You have ${time} seconds to place your bets.`)
                .setColor(randomHexColour())
                .setTimestamp()
                .setFooter({ text: `Game started by ${user.username}` });

            await interaction.reply({ content: `You have bet ${amount} on ${space}. Good luck!`, embeds: [embed] });
        }
    }

    private getColor(number: number): string {
        if (this.colors.red.includes(number)) {
            return 'red';
        }
        else if (this.colors.black.includes(number)) {
            return 'black';
        }
        else {
            return 'green';
        }
    }

    private async endGame(interaction: ChatInputCommandInteraction<CacheType>) {
        const game = this.activeGames.get(interaction.channelId);
        if (!game) return;

        const spin = Math.floor(Math.random() * 37);
        const color = this.getColor(spin);

        let endingString: string[] = [];

        for (const playerBet of game.bets) {
            const { userId, bet, amount } = playerBet;
            const { won, payoutMultiplier } = this.determineWin(bet, spin, color);
            const userProfile: IProfile = await Profile.getProfileById(userId, game.guildId);

            if (won) {
                const payout = amount * payoutMultiplier;
                userProfile.coins += payout;
                await userProfile.save();

                const member = await interaction.guild?.members.fetch(userId);
                
                const memberName = member ? member.displayName : userId;

                endingString.push(`${memberName} won ${payout} coins! Bet: ${bet}`);
            }
            else {
                const member = await interaction.guild?.members.fetch(userId);
                
                const memberName = member ? member.displayName : userId;

                endingString.push(`${memberName} lost ${amount} coins. Bet: ${bet}`);
            }
        }

        const startedByMember = (await interaction.guild?.members.fetch(game.startedBy))?.displayName;

        const displayName = startedByMember ? startedByMember : game.startedBy;

        const colorEmote = color === 'red' ? '🟥' : color === 'black' ? '⬛' : '🟩';

        const embed = new EmbedBuilder()
            .setTitle('Roulette Game Over')
            .setDescription(`The spin was ${spin} ${colorEmote}`)
            .addFields(
                { name: 'Results', value: endingString.join('\n') },
            )
            .setColor(randomHexColour())
            .setTimestamp()
            .setFooter({ text: `Game started by ${displayName}` });

        if (interaction.channel?.isSendable()) {
            await interaction.channel.send({ embeds: [embed] });
        }

        this.activeGames.delete(interaction.channelId);
    }

    private determineWin( bet: string | number, spin: number, color: string ): { won: boolean; payoutMultiplier: number } {
        let won = false;
        let payoutMultiplier = 0;
    
        if (typeof bet === 'number') {
            if (bet === spin) {
                won = true;
                payoutMultiplier = 35;
            }
        }
        else if (bet === 'red' && color === 'red') {
            won = true;
            payoutMultiplier = 2;
        }
        else if (bet === 'black' && color === 'black') {
            won = true;
            payoutMultiplier = 2;
        }
        else if (bet === 'odd' && spin % 2 === 1 && spin !== 0) {
            won = true;
            payoutMultiplier = 2;
        }
        else if (bet === 'even' && spin % 2 === 0 && spin !== 0) {
            won = true;
            payoutMultiplier = 2;
        }
        else if (bet === 'high' && spin >= 19 && spin <= 36) {
            won = true;
            payoutMultiplier = 2;
        }
        else if (bet === 'low' && spin >= 1 && spin <= 18) {
            won = true;
            payoutMultiplier = 2;
        }
        else if (bet === 'dozen1' && spin >= 1 && spin <= 12) {
            won = true;
            payoutMultiplier = 3;
        }
        else if (bet === 'dozen2' && spin >= 13 && spin <= 24) {
            won = true;
            payoutMultiplier = 3;
        }
        else if (bet === 'dozen3' && spin >= 25 && spin <= 36) {
            won = true;
            payoutMultiplier = 3;
        }
    
        return { won, payoutMultiplier };
    }
}

export default new RouletteCommand();