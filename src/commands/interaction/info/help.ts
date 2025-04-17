import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import { randomHexColour } from '../../../modules/random';
import BotClient from '../../../classes/client';

export class HelpCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'help';
        this.description = 'Get help.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw);
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const client = interaction.client as BotClient;

        const commands = client.interactionCommands.sort((a, b) => a.name.localeCompare(b.name));

        const commandsList = commands.map(command => `**/${command.name}** - ${command.description}`).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('Help')
            .setDescription(commandsList || 'No commands available.')
            .setColor(randomHexColour());

        interaction.reply({ embeds: [embed] });
    }
}

export default new HelpCommand();