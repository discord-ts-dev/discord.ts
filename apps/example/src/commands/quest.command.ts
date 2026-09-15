import {
  CommandContext,
  Context,
  Injectable,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';

const Quest = createCommandGroupDecorator({ name: 'quest', description: 'Daily quests' });

@Injectable()
@Quest({ prefix: true })
export class QuestCommand {
  @Subcommand({ name: 'rr', description: 'Reroll your quest' })
  async reroll(@Context() ctx: CommandContext): Promise<void> {
    await ctx.reply('Rerolled your quest.');
  }

  @Subcommand({ name: 'lock', description: 'Lock your quest' })
  async lock(@Context() ctx: CommandContext): Promise<void> {
    await ctx.reply('Locked your quest.');
  }
}
