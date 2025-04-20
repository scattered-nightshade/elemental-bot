import { Client, Collection, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';
import BotHandler from './handler';
import { readdirSync } from 'fs';
import { join, resolve, basename, extname } from 'path';
import { runAtMultipleSpecificTimes } from '../modules/timedEvents';

export class BotClient extends Client {
    interactionCommands: Collection<string, any>;
    interactionButtons: Collection<string, any>;
    interactionSelectMenus: Collection<string, any>;
    messageCommands: Collection<string, any>;
    aliases: Collection<string, any>;
    category: Collection<string, string[]>;
    data: SlashCommandBuilder[];

    cooldowns: Collection<string, Collection<string, number>>;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
            shards: 'auto',
            allowedMentions: { parse: ['roles', 'users'] },
        });

        this.interactionCommands = new Collection<string, any>();
        this.messageCommands = new Collection<string, any>();
        this.interactionButtons = new Collection<string, any>();
        this.interactionSelectMenus = new Collection<string, any>();
        this.aliases = new Collection<string, any>();

        this.category = new Collection<string, string[]>();

        this.data = [];

        this.cooldowns = new Collection<string, Collection<string, number>>();

        this.loadCommandCategories();
    }

    async start() {
        this.loadHandlers();

        this.login(process.env.DISCORD_BOT_TOKEN).then(() => {
            console.log("Connected to Discord");
        }).catch((error) => {
            console.error("Failed to connect to Discord");
            console.error(error);
            this.stop();
        });
    }

    stop() {
        console.log('Stopping bot...');
        this.destroy();
    }

    private loadCommandCategories() {
        const categoriesPath = resolve('./build/commands/interaction');
        const categoryFiles = readdirSync(categoriesPath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

        categoryFiles.forEach(category => {
            const commandsPath = join(categoriesPath, category);
            const commandFiles = readdirSync(commandsPath)
                .filter(file => file.endsWith('.js'))
                .map(file => basename(file, extname(file)));

            this.category.set(category, commandFiles);
        });
    }

    private async loadHandlers() {

        let handlers = readdirSync(join(__dirname, '../handlers'))
            .filter((file) => file.endsWith('.js'))
            .map((file) => basename(file, extname(file)));


        handlers.forEach((handler) => {

            console.log(`Loading handler ${handler}`);

            const handlerPath: string = join(__dirname, `../handlers/${handler}`);
            
            this.importHandler(handlerPath).then((importedHandler: BotHandler) => {
                if (importedHandler.intervalEnabled) {
                    runAtMultipleSpecificTimes(() => {
                        importedHandler.execute(this);
                    }, importedHandler.interval);
                }
                else {
                    importedHandler.execute(this);
                }
            });
        });
    }

    private async importHandler(filePath: string) {
        const handlerModule = await import(filePath);
        return handlerModule.default;
    }
}

export default BotClient;