import { Events, REST, Routes } from 'discord.js';
import BotClient from '../classes/client';
import BotEvent from '../classes/event';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';

config();

class Ready extends BotEvent {

    constructor() {
        super();
        this.name = Events.ClientReady;
        this.once = true;
    }

    async execute(client: BotClient) {
        await this.deployCommands(client.user?.id);
    }

    private async deployCommands(clientID: string | undefined) {
        if (!clientID) return console.error('No client ID found');
        const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN as string);

        console.log('Started refreshing application (/) commands.');

        const commands = await this.getCommandData();

        await rest.put(
            Routes.applicationCommands(clientID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    }

    private async getCommandData() {
        const commands = [];
        const foldersPath = path.join(__dirname, '../commands/interaction');
        const commandFolders = fs.readdirSync(foldersPath);

        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const commandModule = await import(filePath);
                const command = commandModule.default || commandModule;
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                }
                else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }

        return commands;
    }

}

export default new Ready();