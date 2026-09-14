import { Command, Context, Injectable } from '@discord.ts/common';
import type { ChatInputCommandInteraction, Message } from 'discord.js';

@Injectable()
export class PingCommand {
  @Command({ name: 'ping', description: 'Reply with pong', slash: true, prefix: true })
  async handle(@Context() interaction: ChatInputCommandInteraction | Message): Promise<void> {
    await interaction.reply('pong');
  }
}
