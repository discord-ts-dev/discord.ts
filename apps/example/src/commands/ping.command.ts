import { Injectable } from '@nestjs/common';
import type { ChatInputCommandInteraction, Message } from 'discord.js';
import { Command, Context } from '@discord.ts/common';

@Injectable()
export class PingCommand {
  @Command({ name: 'ping', description: 'Reply with pong', slash: true, prefix: true })
  async handle(@Context() interaction: ChatInputCommandInteraction | Message): Promise<void> {
    await interaction.reply('pong');
  }
}
