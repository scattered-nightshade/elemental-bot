import { ButtonInteraction, CacheType, ChatInputCommandInteraction, Collection, Events, Interaction, MessageContextMenuCommandInteraction, MessageFlags, TextChannel, UserContextMenuCommandInteraction } from 'discord.js';
import BotEvent from '../classes/event';
import BotClient from '../classes/client';
import { InteractionCommand } from '../classes/command';

class InteractionCreate extends BotEvent {

    constructor() {
        super();
        this.name = Events.InteractionCreate;
        this.once = false;
    }

    async execute(interaction: Interaction): Promise<any> {
        if (interaction.isChatInputCommand()) {
            return this.applicationCommand(interaction);
        }
        else if (interaction.isButton()) {
            return this.buttons(interaction)
        }
    }

    private async applicationCommand(interaction: ChatInputCommandInteraction<CacheType>) {
        const client: BotClient = interaction.client as BotClient;
        const channel: TextChannel = client.channels.cache.get(interaction.channel?.id as string) as TextChannel;
        const { cooldowns } = client;
        const commandName: string = interaction.commandName;
        const command: InteractionCommand = client.interactionCommands.get(commandName);

        if (!command) {
            console.error(`Could not find command "${commandName}"`);
            return;
        }

        if (command.nsfw && !channel.nsfw) {
            return interaction.reply({ content: 'This command can only be used in NSFW channels.', flags: MessageFlags.Ephemeral });
        }

        const cooldownDuration = command.cooldown ?? 3;
        const userCooldowns = this.getUserCooldowns(cooldowns, command.data.name);
        const remainingCooldown = this.getRemainingCooldown(interaction, userCooldowns, cooldownDuration);

        if (remainingCooldown > 0) {
            const expiredTimestamp = Math.round((Date.now() + remainingCooldown) / 1000);
            await interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            await command.execute(interaction);
        }
        catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        }

        userCooldowns.set(interaction.user.id, Date.now());
        setTimeout(() => userCooldowns.delete(interaction.user.id), cooldownDuration * 1000);
    }

    private async buttons(interaction: ButtonInteraction<CacheType>) {
        const customId: string = interaction.customId;

        
    }

    private getUserCooldowns(cooldowns: Collection<string, Collection<string, number>>, commandName: string): Collection<string, number> {
        let userCooldowns = cooldowns.get(commandName);

        if (!userCooldowns) {
            userCooldowns = new Collection<string, number>();
            cooldowns.set(commandName, userCooldowns);
        }

        return userCooldowns;
    }

    private getRemainingCooldown(interaction: Interaction, userCooldowns: Collection<string, number>, cooldownDuration: number): number {
        const lastUsed = userCooldowns.get(interaction.user.id);

        if (!lastUsed) {
            return 0;
        }

        const now = Date.now();
        const expirationTime = lastUsed + cooldownDuration * 1000;
        return Math.max(expirationTime - now, 0);
    }
}

export default new InteractionCreate();