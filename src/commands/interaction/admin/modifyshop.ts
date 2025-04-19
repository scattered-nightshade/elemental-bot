import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, APIInteractionDataResolvedGuildMember, EmbedBuilder, PermissionsBitField, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Profile from '../../../schemas/profileModel';
import { randomHexColour } from '../../../modules/random';
import Shop, { IShopItem } from '../../../schemas/shopModel';

export class ModifyShopCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'modifyshop';
        this.description = 'Modify this server\'s shop.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setNSFW(this.nsfw)
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(subcommand =>
                subcommand
                    .setName('add')
                    .setDescription('Add an item to the shop.')
                    .addStringOption(option => option.setName('name').setDescription('The name of the item.').setRequired(true))
                    .addNumberOption(option => option.setName('price').setDescription('The price of the item.').setRequired(true))
                    .addStringOption(option => option.setName('description').setDescription('A description of the item.').setRequired(false))
                    .addStringOption(option => option.setName('emoji').setDescription('An emoji for the item.').setRequired(false))
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('remove')
                    .setDescription('Remove an item from the shop.')
                    .addStringOption(option => option.setName('itemid').setDescription('The ID of the item to remove.').setRequired(true))
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('edit')
                    .setDescription('Edit an item in the shop.')
                    .addStringOption(option => option.setName('itemid').setDescription('The ID of the item to edit.').setRequired(true))
                    .addStringOption(option => option.setName('name').setDescription('The new name of the item.').setRequired(false))
                    .addNumberOption(option => option.setName('price').setDescription('The new price of the item.').setRequired(false))
                    .addStringOption(option => option.setName('description').setDescription('The new description of the item.').setRequired(false))
                    .addStringOption(option => option.setName('emoji').setDescription('The new emoji for the item.').setRequired(false))
            );    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const guild = interaction.guild;


        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add': {
                const name = interaction.options.getString('name', true);
                const price = interaction.options.getNumber('price', true);
                const description = interaction.options.getString('description') || '';
                const emoji = interaction.options.getString('emoji') || '';

                const sanitizedName = name.toLowerCase().replace(/\s+/g, '-');
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                const currentTimestamp = Date.now()
                const itemID = `${sanitizedName}-${randomSuffix}-${currentTimestamp}`;
            

                const item = {
                    itemID,
                    name,
                    price,
                    description,
                    emoji
                };

                await Shop.addItemToShop(guild.id, item);
                interaction.reply({ content: `Item "${name}" has been added to the shop.`, flags: MessageFlags.Ephemeral });
                break;
            }

            case 'remove': {
                const itemID = interaction.options.getString('itemid', true);

                const updatedShop = await Shop.removeItemFromShop(guild.id, itemID);
                if (updatedShop) {
                    interaction.reply({ content: `Item with ID "${itemID}" has been removed from the shop.`, flags: MessageFlags.Ephemeral });
                } else {
                    interaction.reply({ content: `Failed to remove item with ID "${itemID}". It may not exist.`, flags: MessageFlags.Ephemeral });
                }
                break;
            }

            case 'edit': {
                const itemID = interaction.options.getString('itemid', true);
                const name = interaction.options.getString('name');
                const price = interaction.options.getNumber('price');
                const description = interaction.options.getString('description');
                const emoji = interaction.options.getString('emoji');

                const updatedItem: Partial<IShopItem> = {};
                if (name) updatedItem.name = name;
                if (price) updatedItem.price = price;
                if (description) updatedItem.description = description;
                if (emoji) updatedItem.emoji = emoji;

                const updatedShop = await Shop.updateItemInShop(guild.id, itemID, updatedItem);
                if (updatedShop) {
                    interaction.reply({ content: `Item with ID "${itemID}" has been updated.`, flags: MessageFlags.Ephemeral });
                } else {
                    interaction.reply({ content: `Failed to update item with ID "${itemID}". It may not exist.`, flags: MessageFlags.Ephemeral });
                }
                break;
            }

            default:
                interaction.reply({ content: 'Invalid subcommand.', flags: MessageFlags.Ephemeral});
        }

    }
}

export default new ModifyShopCommand();