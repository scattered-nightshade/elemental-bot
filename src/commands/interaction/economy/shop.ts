import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder, MessageFlags, ComponentType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
                let page = interaction.options.getInteger('page') || 1;
                let itemsPerPage = 10;
                let totalItems = guildProfile.items.length;
                let totalPages = Math.ceil(totalItems / itemsPerPage);
    
                if (page < 1 || page > totalPages) {
                    interaction.reply({ content: `Invalid page number. Please choose a page between 1 and ${totalPages}.`, flags: MessageFlags.Ephemeral });
                    return;
                }
    
                let startIndex = (page - 1) * itemsPerPage;
                let endIndex = startIndex + itemsPerPage;
                let itemsToShow = guildProfile.items.slice(startIndex, endIndex);
    
                const embed = new EmbedBuilder()
                    .setTitle('Shop Items')
                    .setDescription(itemsToShow.map(item => `${item.emoji || ''} **${item.name}** - ${item.price} coins\n${item.description || ''}`).join('\n\n') || 'No items available in the shop.')
                    .setFooter({ text: `Page ${page} of ${totalPages}` })
                    .setColor(randomHexColour());
    
                const response = await interaction.reply({ embeds: [embed], components: [this.getActionRows(page, itemsPerPage, totalItems)], withResponse: true });

                const resource = response.resource;

                if (!resource) {
                    console.error('Failed to get resource from interaction reply.');
                    return;
                }
                
                const message = resource.message;

                if (!message) {
                    console.error('Failed to get message from interaction reply.');
                    return;
                }

                const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30 * 1000 });

                collector.on('collect', async buttonInteraction => {
                    if (buttonInteraction.user.id != interaction.user.id) {
                        return;
                    }

                    if (buttonInteraction.customId === 'shopleft') {
                        page--;
                    }

                    if (buttonInteraction.customId === 'shopright') {
                        page++;
                    }

                    itemsPerPage = 10;
                    totalItems = guildProfile.items.length;
                    totalPages = Math.ceil(totalItems / itemsPerPage);
                    startIndex = (page - 1) * itemsPerPage;
                    endIndex = startIndex + itemsPerPage;
                    itemsToShow = guildProfile.items.slice(startIndex, endIndex);

                    const updateEmbed = new EmbedBuilder()
                        .setTitle('Shop Items')
                        .setDescription(itemsToShow.map(item => `${item.emoji || ''} **${item.name}** - ${item.price} coins\n${item.description || ''}`).join('\n\n') || 'No items available in the shop.')
                        .setFooter({ text: `Page ${page} of ${totalPages}` })
                        .setColor(randomHexColour());

                    await buttonInteraction.update({ embeds: [updateEmbed], components: [this.getActionRows(page, itemsPerPage, totalItems)]});
                });

                break;
            }
        }
    }

    private getActionRows(page: number, itemsPerPage: number, totalItems: number) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shopleft')
                    .setLabel('◀️')
                    .setDisabled(page <= 1)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shopright')
                    .setLabel('▶️')
                    .setDisabled(page >= totalPages)
                    .setStyle(ButtonStyle.Secondary),
            );
    
        return row;
    }
}

export default new ShopCommand();