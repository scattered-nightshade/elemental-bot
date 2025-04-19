import { model, Schema, Document } from 'mongoose';

export interface ILevelAwardRole {
    roleID: string;
    level: number;
}

export interface IGuild extends Document {
    guildID: string;
    levelsEnabled: boolean;
    levelAwardRoles: ILevelAwardRole[];
}

const levelAwardRoleSchema = new Schema<ILevelAwardRole>({
    roleID: { type: String, required: true },
    level: { type: Number, required: true }
}, { _id: false });

const guildSchema = new Schema<IGuild>({
    guildID: { type: String, required: true, unique: true },
    levelsEnabled: { type: Boolean, default: true },
    levelAwardRoles: { type: [levelAwardRoleSchema], default: [] }
}, { timestamps: true });

const GuildModel = model<IGuild>('guilds', guildSchema);

class Guild {
    static async getGuildById(guildID: string): Promise<IGuild> {
        return GuildModel.findOneAndUpdate({ guildID }, { guildID }, { upsert: true, new: true });
    }

    static async updateGuild(guildID: string, update: Partial<IGuild>): Promise<IGuild | null> {
        return GuildModel.findOneAndUpdate({ guildID }, update, { upsert: true, new: true });
    }
}

export default Guild;