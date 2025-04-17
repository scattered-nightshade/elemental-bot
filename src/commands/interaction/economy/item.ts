import { CacheType, ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { InteractionCommand } from '../../../classes/command';
import Shop from '../../../schemas/shopModel';
import { randomHexColour } from '../../../modules/random';

export class ItemCommand extends InteractionCommand {
    constructor() {
        super();
        this.name = 'item';
        this.description = 'View details of a shop item.';
        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(option => option.setName('name').setDescription('The name of the item to view.').setRequired(true));
    }

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const guild = interaction.guild;
        const itemName = interaction.options.getString('name', true).toLowerCase();

        if (!guild) {
            console.error(`Failed to find guild in ${this.name}`);
            return;
        }

        const shop = await Shop.getShopByGuild(guild.id);
        if (!shop || shop.items.length === 0) {
            interaction.reply({ content: 'The shop is empty or does not exist.', flags: MessageFlags.Ephemeral });
            return;
        }

        const item = shop.items.find(i => i.name.toLowerCase() === itemName);
        if (!item) {
            interaction.reply({ content: `Item "${itemName}" not found in the shop.`, flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Item: ${item.name}`)
            .setDescription(item.description || 'No description provided.')
            .addFields(
                { name: 'Price', value: `${item.price} coins`, inline: true },
                { name: 'Emoji', value: item.emoji || 'None', inline: true },
                { name: 'Item ID', value: item.itemID, inline: false }
            )
            .setColor(randomHexColour());

        interaction.reply({ embeds: [embed] });
    }
}

export default new ItemCommand();