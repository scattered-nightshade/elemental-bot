import { model, Schema, Document } from 'mongoose';

export interface IProfile extends Document {
    userID: string;
    guildID: string;
    coins: number;
    xp: number;
    level: number;
    cooldowns: {
        dailyGotten: Date;
        weeklyGotten: Date;
        monthlyGotten: Date;
    };
    inventory: IInventoryItem[]
}

export interface IInventoryItem {
    itemID: string;
    quantity: number;
}

const profileSchema = new Schema({
    userID: { type: Schema.Types.String, required: true, unique: true },
    guildID: { type: Schema.Types.String, required: true },
    coins: { type: Schema.Types.Number, default: 0 },
    xp: { type: Schema.Types.Number, default: 0 },
    level: { type: Schema.Types.Number, default: 0 },
    cooldowns: {
        dailyGotten: { type: Schema.Types.Date, default: null },
        weeklyGotten: { type: Schema.Types.Date, default: null },
        monlthyGotten: { type: Schema.Types.Date, default: null }
    },
    inventory: [
        {
            itemID: { type: Schema.Types.String },
            quantity: { type: Number, default: 0 }
        }
    ]
}, { timestamps: true });

const ProfileModel = model<IProfile>('profiles', profileSchema);

class Profile {
    userID: string;
    guildID: string;
    coins: number;
    xp: number;
    level: number;
    cooldowns: {
        dailyGotten: Date | null;
        weeklyGotten: Date | null;
        monthlyGotten: Date | null;
    }
    inventory: IInventoryItem[]

    constructor(userID: string, guildID: string, coins: number = 0, xp: number = 0, level: number = 0, cooldowns: { dailyGotten?: Date | null; weeklyGotten?: Date | null; monthlyGotten?: Date | null } = {}, inventory: IInventoryItem[] = []) {
        this.userID = userID;
        this.guildID = guildID;
        this.coins = coins;
        this.xp = xp;
        this.level = level;
        this.cooldowns = {
            dailyGotten: cooldowns.dailyGotten || null,
            weeklyGotten: cooldowns.weeklyGotten || null,
            monthlyGotten: cooldowns.monthlyGotten || null,
        };
        this.inventory = inventory;
    }

    static async getAllProfiles(): Promise<IProfile[]> {
        return ProfileModel.find();
    }

    static async getProfileById(userID: string, guildID: string): Promise<IProfile> {
        return ProfileModel.findOneAndUpdate({ userID, guildID }, { userID, guildID }, { upsert: true, new: true });
    }

    static async getProfilesByUser(userID: string): Promise<IProfile[]> {
        return ProfileModel.find({ userID });
    }

    static async getProfilesByGuild(guildID: string): Promise<IProfile[]> {
        return ProfileModel.find({ guildID });
    }

    async save(): Promise<IProfile> {

        const profile = new ProfileModel({
            userID: this.userID,
            guildID: this.guildID,
        });

        return profile.save();
    }

    static async updateProfile(userID: string, guildID: string, update: Partial<IProfile>): Promise<IProfile | null> {
        return ProfileModel.findOneAndUpdate({ userID, guildID }, update, { upsert: true, new: true });
    }

    static async deleteProfile(userID: string, guildID: string): Promise<IProfile | null> {
        return ProfileModel.findOneAndDelete({ userID, guildID });
    }

    static xpToNextLevel(level: number = 0) {
        return 50 * (level + 1 ** 2);
    }

}

export default Profile;