import { Collection, Events, Message } from 'discord.js';
import BotEvent from '../classes/event';
import Profile, { IProfile } from '../schemas/profileModel';
import Guild, { IGuild } from '../schemas/guildModel';

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
        const guildData = await Guild.getGuildById(guild.id);

        if (guildData.levelsEnabled){
            this.handleXP(message, profileData, guildData);
        }
    }

    private handleXP(message: Message, data: IProfile, guildData: IGuild) {

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
            data.level++;

            this.handleLevels(message, data, guildData);
        }

        data.save();
    }

    private async handleLevels(message: Message, data: IProfile, guildData: IGuild) {

        message.reply({ content: `You have leveled up to level ${data.level}!`, allowedMentions: { repliedUser: false } });

        if (!guildData?.levelAwardRoles?.length) return;
        const member = await message.guild?.members.fetch(message.author.id);
        if (!member) return;

        for (const award of guildData.levelAwardRoles) {
            if (data.level >= award.level && !member.roles.cache.has(award.roleID)) {
                try {
                    await member.roles.add(award.roleID, `Level up to ${data.level}`);
                } 
                catch (err) {
                    console.error(err)    
                }
            }
        }
    }
}

export default new MessageCreate();