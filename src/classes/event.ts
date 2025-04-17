/* eslint-disable no-unused-vars */
class BotEvent {
    name: string;
    once: boolean;

    constructor() {
        this.name = '';
        this.once = false;
    }

    async execute(...args: any[]) {
        throw new Error(`Command ${this.name} doesn't provide an execute() method!`);
    }
}

export default BotEvent;