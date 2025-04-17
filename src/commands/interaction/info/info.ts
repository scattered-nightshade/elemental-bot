import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import { randomHexColour } from '../../../modules/random';

export class InfoCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'info';
        this.description = 'Get info about this bot.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw);
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {

        const infoString: string = 'Economy Bot made by @scattered.nightshade';

        const embed = new EmbedBuilder()
            .setTitle('Info')
            .setDescription(infoString)
            .setColor(randomHexColour());

        interaction.reply({ embeds: [embed] });
    }
}

export default new InfoCommand();