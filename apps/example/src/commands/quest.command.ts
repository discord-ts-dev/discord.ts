import { Context, Injectable, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import type { ChatInputCommandInteraction, Message } from 'discord.js';

const Quest = createCommandGroupDecorator({ name: 'quest', description: 'Daily quests' });

type Ctx = ChatInputCommandInteraction | Message;

@Injectable()
@Quest({ prefix: true })
export class QuestCommand {
  @Subcommand({ name: 'rr', description: 'Reroll your quest' })
  async reroll(@Context() ctx: Ctx): Promise<void> {
    await ctx.reply('Rerolled your quest.');
  }

  @Subcommand({ name: 'lock', description: 'Lock your quest' })
  async lock(@Context() ctx: Ctx): Promise<void> {
    await ctx.reply('Locked your quest.');
  }
}
