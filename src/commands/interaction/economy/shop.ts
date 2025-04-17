import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import { randomHexColour } from '../../../modules/random';
import Shop, { IShopItem } from '../../../schemas/shopModel';
import Profile from '../../../schemas/profileModel';

export class ShopCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'shop';
        this.description = 'Check whats inside the shop';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .addSubcommand(subcommand => 
                subcommand
                    .setName('buy')
                    .setDescription('Buy an item from the shop.')
                    .addStringOption(option => option.setName('item').setDescription('The item to buy').setRequired(true))
                    .addIntegerOption(option => option.setName('amount').setDescription('The amount to buy').setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('show')
                    .setDescription('Show the shop items.')
                    .addIntegerOption(option => option.setName('page').setDescription('The page number to show').setRequired(false)));
        }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const guild = interaction.guild;
        const subcommand = interaction.options.getSubcommand();
    
        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }
    
        const guildProfile = await Shop.getShopByGuild(guild.id);
    
        switch (subcommand) {
            case 'buy': {
                const itemName = interaction.options.getString('item', true);
                const amount = interaction.options.getInteger('amount') || 1;
                const user = interaction.user;
    
                const userProfile = await Profile.getProfileById(user.id, guild.id);
                const shopItem = guildProfile.items.find(item => item.name.toLowerCase() == itemName.toLowerCase());
    
                if (!shopItem) {
                    interaction.reply({ content: `Item "${itemName}" not found in the shop.`, flags: MessageFlags.Ephemeral });
                    return;
                }
    
                const totalPrice = shopItem.price * amount;
    
                if (userProfile.coins < totalPrice) {
                    interaction.reply({ content: `You don't have enough coins to buy ${amount}x "${shopItem.name}".`, flags: MessageFlags.Ephemeral });
                    return;
                }
    
                userProfile.coins -= totalPrice;
                const inventoryItem = userProfile.inventory.find(item => item.itemID == shopItem.itemID);
    
                if (inventoryItem) {
                    inventoryItem.quantity += amount;
                } else {
                    userProfile.inventory.push({ itemID: shopItem.itemID, quantity: amount });
                }
    
                await Profile.updateProfile(user.id, guild.id, { coins: userProfile.coins, inventory: userProfile.inventory });
    
                interaction.reply({ content: `You successfully bought ${amount}x "${shopItem.name}" for ${totalPrice} coins.` });
                break;
            }
    
            case 'show': {
                const page = interaction.options.getInteger('page') || 1;
                const itemsPerPage = 10;
                const totalItems = guildProfile.items.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
    
                if (page < 1 || page > totalPages) {
                    interaction.reply({ content: `Invalid page number. Please choose a page between 1 and ${totalPages}.`, flags: MessageFlags.Ephemeral });
                    return;
                }
    
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const itemsToShow = guildProfile.items.slice(startIndex, endIndex);
    
                const embed = new EmbedBuilder()
                    .setTitle('Shop Items')
                    .setDescription(itemsToShow.map(item => `${item.emoji || ''} **${item.name}** - ${item.price} coins\n${item.description || ''}`).join('\n\n') || 'No items available in the shop.')
                    .setFooter({ text: `Page ${page} of ${totalPages}` })
                    .setColor(randomHexColour());
    
                interaction.reply({ embeds: [embed] });
                break;
            }
        }
    }
}

export default new ShopCommand();