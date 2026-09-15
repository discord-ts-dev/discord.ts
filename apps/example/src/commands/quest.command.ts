import { Context, Injectable, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import type { ChatInputCommandInteraction } from 'discord.js';

const Quest = createCommandGroupDecorator({ name: 'quest', description: 'Daily quests' });

@Injectable()
@Quest()
export class QuestCommand {
  @Subcommand({ name: 'rr', description: 'Reroll your quest' })
  async reroll(@Context() interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply('Rerolled your quest.');
  }

  @Subcommand({ name: 'lock', description: 'Lock your quest' })
  async lock(@Context() interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply('Locked your quest.');
  }
}
