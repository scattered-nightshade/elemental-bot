import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';

export class PingCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'ping';
        this.description = 'Ping the bot to see if it\'s alive!';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw);
    }

    async execute(interaction: CommandInteraction) {
        const pingMessage = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const ping = pingMessage.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply({ content: `Pong! Latency: ${ping}ms` });
    }
}

export default new PingCommand();