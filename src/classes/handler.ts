class BotHandler {
    intervalEnabled: boolean;
    interval: Time[];

    constructor() {
        this.intervalEnabled = false;
        this.interval = [];
    }

    async execute(...args: any[]) {
        throw new Error(`Handler doesn't provide an execute() method!`);
    }
}

export default BotHandler;