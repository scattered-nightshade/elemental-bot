import { model, Schema, Document } from 'mongoose';

export interface IShop extends Document {
    guildID: string;
    items: IShopItem[];
}

export interface IShopItem {
    itemID: string;
    name: string;
    price: number;
    description?: string;
    emoji?: string;
}

const shopItemSchema = new Schema({
    itemID: { type: String, required: true },
    name: { type: String, required: true }, 
    price: { type: Number, required: true },
    description: { type: String },
    emoji: { type: String } 
});

const shopSchema = new Schema({
    guildID: { type: String, required: true, unique: true },
    items: [shopItemSchema]
}, { timestamps: true });

const ShopModel = model<IShop>('shops', shopSchema);

class Shop {
    static async getShopByGuild(guildID: string): Promise<IShop> {
        return ShopModel.findOneAndUpdate({ guildID }, {}, { upsert: true, new: true });
    }

    static async createShop(guildID: string): Promise<IShop> {
        const shop = new ShopModel({ guildID, items: [] });
        return shop.save();
    }

    static async addItemToShop(guildID: string, item: IShopItem): Promise<IShop> {
        return ShopModel.findOneAndUpdate({ guildID }, { $push: { items: item } }, { new: true, upsert: true });
    }

    static async removeItemFromShop(guildID: string, itemID: string): Promise<IShop> {
        return ShopModel.findOneAndUpdate({ guildID }, { $pull: { items: { itemID } } }, { upsert: true, new: true } );
    }

    static async updateItemInShop(guildID: string, itemID: string, updatedItem: Partial<IShopItem>): Promise<IShop | null> {
        return ShopModel.findOneAndUpdate({ guildID, "items.itemID": itemID }, { $set: { "items.$": { ...updatedItem, itemID } } }, { upsert: true, new: true } );
    }

    static async getItemFromShop(guildID: string, itemID: string): Promise<IShopItem | null> {
        const shop = await ShopModel.findOneAndUpdate({ guildID }, {}, { upsert: true, new: true});
        return shop?.items.find(item => item.itemID === itemID) || null;
    }

    static async clearShop(guildID: string): Promise<IShop | null> {
        return ShopModel.findOneAndUpdate({ guildID }, { $set: { items: [] } }, { upsert: true, new: true } );
    }
}

export default Shop;