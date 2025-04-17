import BotClient from '../classes/client';
import BotHandler from '../classes/handler';
import { readdirSync } from 'fs';
import { join } from 'path';

export class EventHandler extends BotHandler {

    constructor() {
        super();
    }

    async execute(client: BotClient): Promise<void> {
        console.log('Loading events...');

        const eventFiles = readdirSync(join(__dirname, '../events'))
            .filter((file: string) => {
                return file.endsWith('.js');
            });

        this.loadEvents(client, eventFiles);
    }

    private async loadEvents(client: BotClient, eventFiles: string[]) {
        for (const file of eventFiles) {

            console.log(`Loading event ${file}`);

            const eventPath: string = join(__dirname, `../events/${file}`);
            this.importEvent(eventPath).then((event: any) => {
                if (event.once) {
                    client.once(event.name, (...args: any) => event.execute(...args));
                }
                else {
                    client.on(event.name, (...args: any) => event.execute(...args));
                }
            });
        }
    }

    private async importEvent(filePath: string) {
        const eventModule = await import(filePath);
        return eventModule.default;
    }
}

export default new EventHandler();