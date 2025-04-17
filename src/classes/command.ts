/* eslint-disable no-unused-vars */
import { CacheType, ChatInputCommandInteraction, CommandInteraction, InteractionContextType, Message, SlashCommandBuilder } from 'discord.js';
import BotClient from './client';

export class BotCommand {
    name: string;
    description: string;
    cooldown: number;
    disabled: boolean;
    nsfw: boolean;

    constructor() {
        this.name = 'commandname';
        this.description = 'command description';
        this.cooldown = 3;
        this.disabled = false;
        this.nsfw = false;
    }
}

export class InteractionCommand extends BotCommand {

    data: any;

    constructor() {
        super();
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setContexts(InteractionContextType.Guild)
            .setNSFW(this.nsfw);
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        throw new Error(`Command ${this.name} doesn't provide an execute() method!`);
    }

    reload() {
        return require.resolve(`../commands/interaction/${this.name}`);
    }
}

export class MessageCommand extends BotCommand {
    aliases: string[];

    constructor() {
        super();
        this.aliases = [];
    }

    async execute(message: Message, args: string[]) {
        throw new Error(`Command ${this.name} doesn't provide an execute() method!`);
    }

    reload() {
        return require.resolve(`../commands/message/${this.name}`);
    }
}