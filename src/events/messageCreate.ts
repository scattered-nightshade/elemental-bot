import { Collection, Events, Message } from 'discord.js';
import BotEvent from '../classes/event';
import Profile, { IProfile } from '../schemas/profileModel';

class MessageCreate extends BotEvent {
    private xpCooldowns = new Collection<string, number>();


    constructor() {
        super();
        this.name = Events.MessageCreate;
        this.xpCooldowns = new Collection()
    }

    async execute(message: Message) {

        if (message.author.bot) {
            return;
        }

        const guild = message.guild;

        if (!guild) {
            return;
        }

        const userId = message.author.id;
        const profileData = await Profile.getProfileById(userId, guild.id);


        this.handleXP(message, profileData);
    }

    handleXP(message: Message, data: IProfile) {

        const cooldown = this.xpCooldowns.get(message.author.id);
        const now = Date.now();

        if (cooldown && now < cooldown) {
            return;
        }

        this.xpCooldowns.set(message.author.id, now + 60000);

        const baseXP = 5;
        const bonusXP = Math.min(Math.floor(message.content.length / 20), 10);
        data.xp += baseXP + bonusXP;

        const xpToNextLevel = Profile.xpToNextLevel(data.level);

        if (xpToNextLevel <= data.xp) {
            data.xp -= xpToNextLevel;
            data.level++
        }

        data.save();
    }
}

export default new MessageCreate();