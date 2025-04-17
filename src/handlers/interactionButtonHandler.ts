import BotClient from '../classes/client';
import BotHandler from '../classes/handler';
import { InteractionCommand } from '../classes/command';
import { readdirSync } from 'fs';
import { resolve } from 'path';

export class InteractionButtonHandler extends BotHandler {

    constructor() {
        super();
    }

    async execute(client: BotClient): Promise<void> {
        console.log('Loading interaction buttons...');
        return;

        const buttons: string[] = readdirSync(`./build/interactions/buttons`).filter((file) => file.endsWith('.js'));
        await this.loadButtons(client, buttons);
    }

    private async loadButtons(client: BotClient, buttons: string[]) {

        const buttonPathLog: string[] = [];

        for (const file of buttons) {
            const buttonPath = resolve(`./build/commands/interaction/${file}`);

            buttonPathLog.push(buttonPath);

            const pull: InteractionCommand = await this.importButton(buttonPath);

            if (!pull.name) {
                console.log(`Skipped loading interaction button from ${buttonPath}`);
                continue;
            }

            console.log(`Loaded interaction button ${pull.name}`);
            client.interactionButtons.set(pull.name, pull);
        }
    }

    private async importButton(filePath: string) {
        const buttonModule = await import(filePath);
        return buttonModule.default;
    }
}

export default new InteractionButtonHandler();