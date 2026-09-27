import { Command, Context, Injectable } from '@discord-ts-dev/common';
import type { ChatInputCommandInteraction } from 'discord.js';

@Injectable()
export class PingCommand {
  @Command({ name: 'ping', description: 'Reply with pong' })
  async handle(@Context() interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply('pong');
  }
}
