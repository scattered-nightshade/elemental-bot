import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType, InteractionCallbackResource, Message, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour, randomInRange, randomIntInRange } from '../../../modules/random';

export class HighLowCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'highlow';
        this.description = 'Play high or low with increasing multiplier.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addIntegerOption(option => 
                option.setName('initialbet')
                    .setDescription('Initial bet amount')
                    .setRequired(true)
            );
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const user = interaction.user;
        const guild = interaction.guild;
        const initialBet = interaction.options.getInteger('initialbet', true);

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const userProfile = await Profile.getProfileById(user.id, guild.id);

        if (initialBet <= 0) {
            await interaction.reply({ content: 'The initial bet must be greater than 0.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (userProfile.coins < initialBet) {
            await interaction.reply({ content: 'You do not have enough coins to place this bet.', flags: MessageFlags.Ephemeral });
            return;
        }

        let multiplier = 1;
        let currentNumber = randomIntInRange(0, 100);
        let previousNumber = currentNumber;
        let rounds = 0;
        let gameActive = true;
        let range = 100;

        const embed = new EmbedBuilder()
            .setTitle('High or Low Game')
            .setDescription(`The current number is **${currentNumber}**. Will the next number be higher or lower?`)
            .setColor(randomHexColour())
            .addFields(
                { name: 'Multiplier', value: `${multiplier}x`, inline: true },
                { name: 'Current Bet', value: `${Math.floor(initialBet * multiplier)} coins`, inline: true },
                { name: 'Range', value: `0 - ${range}`, inline: true },
            )
            .setFooter({ text: `You\'re on round ${rounds + 1}.` });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('higher')
                    .setLabel('🔼')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('lower')
                    .setLabel('🔽')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('forfeit')
                    .setLabel('Forfeit')
                    .setStyle(ButtonStyle.Danger)
            );

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

        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60 * 1000 });

        collector.on('collect', async buttonInteraction => {
            if (buttonInteraction.user.id != user.id) {
                await buttonInteraction.reply({ content: 'This is not your game!', flags: MessageFlags.Ephemeral });
                return;
            }

            let guessedHigher = buttonInteraction.customId === 'higher';
            let nextNumber = this.getWeightedNextNumber(currentNumber, range, guessedHigher);
            let isHigher = nextNumber > currentNumber;
            
            if (nextNumber === currentNumber) {
                isHigher = guessedHigher;
            }

            if (buttonInteraction.customId === 'forfeit') {
                gameActive = false;
                await buttonInteraction.update({ content: `You forfeited the game. Your inital bet was ${initialBet} and you won **${Math.floor(initialBet * multiplier)} coins for ${rounds} rounds**.`, embeds: [], components: [] });
                await Profile.updateProfile(user.id, guild.id, { coins: userProfile.coins + Math.floor(initialBet * multiplier) });
                collector.stop();
                return;
            }

            let probability = guessedHigher ? (range - currentNumber - 1) / range : currentNumber / range;

            let multiplierIncrease = (1 - probability);
            
            const resultEmbed = new EmbedBuilder()
                .setTitle('High or Low Game')
                .setDescription(`The next number was **${nextNumber}**.\nIt was **${isHigher ? 'higher' : 'lower'}** than **${currentNumber}**.`)
                .setColor(isHigher === guessedHigher ? '#00FF00' : '#FF0000')
                .addFields(
                    { name: 'Multiplier', value: `${multiplier.toFixed(2)}x + ${multiplierIncrease.toFixed(2)}x`, inline: true },
                    { name: 'Current Bet', value: `${Math.floor(initialBet * multiplier)} + ${Math.floor(initialBet * multiplierIncrease)} coins`, inline: true },
                    { name: 'Range', value: `0 - ${range}`, inline: true },
                )
                .setFooter({ text: isHigher === guessedHigher ? 'You guessed correctly!' : 'You guessed incorrectly!' });
            
            await buttonInteraction.update({ embeds: [resultEmbed], components: [] });
            
            collector.resetTimer();

            const waitTime = 2.5;
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
            
            if (isHigher === guessedHigher) {

                multiplier += multiplierIncrease;

                previousNumber = currentNumber;
                currentNumber = nextNumber;
                rounds++;
                let minRange = Math.max(10, range - 5);
                range = minRange;
            
                const updatedEmbed = new EmbedBuilder()
                    .setTitle('High or Low Game')
                    .setDescription(`The previous number was **${previousNumber}**.\n\nThe current number is **${currentNumber}**. Will the next number be higher or lower?`)
                    .setColor(randomHexColour())
                    .addFields(
                        { name: 'Multiplier', value: `${multiplier.toFixed(2)}x`, inline: true },
                        { name: 'Current Bet', value: `${Math.floor(initialBet * multiplier)} coins`, inline: true },
                        { name: 'Range', value: `0 - ${range}`, inline: true },
                    )
                    .setFooter({ text: `You\'re on round ${rounds + 1}.` });
            
                await buttonInteraction.editReply({ embeds: [updatedEmbed], components: [row] });
            } 
            else {
                gameActive = false;
                await buttonInteraction.editReply({ content: `You lost! The next number was **${nextNumber}**. You won **0 coins**.`, embeds: [], components: [] });
                collector.stop();
                await Profile.updateProfile(user.id, guild.id, { coins: userProfile.coins - initialBet });
                return;
            }
        });

        collector.on('end', async () => {
            if (gameActive) {
                await interaction.editReply({ content: 'The game has ended due to inactivity.', components: [] });
            }
        });
    }

    getWeightedNextNumber(currentNumber: number, range: number, guessedHigher: boolean): number {

        /*
         * This Function exists to make games more fair for the player to make them have more fun
        */ 


        const bias = 0.45;
        const favorPlayer = Math.random() < bias;
    
        if (guessedHigher) {
            if (favorPlayer) {
                return randomIntInRange(currentNumber + 1, range);
            } else {
                return randomIntInRange(0, range);
            }
        } else {
            if (favorPlayer) {
                return randomIntInRange(0, currentNumber - 1);
            } else {
                return randomIntInRange(0, range);
            }
        }
    }
    
}

export default new HighLowCommand();