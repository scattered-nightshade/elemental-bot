import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';
import Shop from '../../../schemas/shopModel';

export class InventoryCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'inventory';
        this.description = 'Check your\'s or someone else\'s inventory.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .addUserOption(option => option.setName('member').setDescription('The member to check the inventory of.').setRequired(false));
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const user = interaction.options.getUser('member') || interaction.user;
        const guild = interaction.guild;

        if (!user) {
            console.error(`Failed to find user in ${this.name}`);
            return;
        }

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const userProfile = await Profile.getProfileById(user.id, guild.id);

        const inventory = await Promise.all(userProfile.inventory.map(async (item) => {
            const shopItem = await Shop.getItemFromShop(guild.id, item.itemID);

            if (!shopItem) {
                return `Unknown item x${item.quantity}`;
            }
            return `${shopItem.emoji ? shopItem.emoji : ''} ${shopItem.name} x${item.quantity}`;
        }));

        console.log(inventory);

        const inventoryString = inventory.length > 0 ? inventory.join('\n') : 'No items in inventory.';

        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Inventory`)
            .setDescription(inventoryString)
            .setColor(randomHexColour())
        
        interaction.reply({ embeds: [embed] })
    }
}

export default new InventoryCommand();