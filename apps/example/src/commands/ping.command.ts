import { Injectable } from '@nestjs/common';
import type { ChatInputCommandInteraction } from 'discord.js';
import { Context, SlashCommand } from '@discord-ts/common';

@Injectable()
export class PingCommand {
  @SlashCommand({ name: 'ping', description: 'Reply with pong' })
  async handle(@Context() interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply('pong');
  }
}
