import { Command, Context, Injectable } from '@discord.ts/common';
import type { ChatInputCommandInteraction } from 'discord.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

@Injectable()
@PlayerGuarded()
export class VoteCommand {
  @Command({ name: 'vote', description: 'Vote for Paw on the bot lists' })
  async vote(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    await ctx.reply(tt(ctx, 'game:vote.body'));
  }
}
