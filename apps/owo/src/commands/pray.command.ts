import { Command, Context, Injectable } from '@discord.ts/common';
import type { ChatInputCommandInteraction } from 'discord.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

const prayerKey = (userId: string) => `prayer:${userId}`;

@Injectable()
@PlayerGuarded()
export class PrayCommand {
  @Command({ name: 'pray', description: 'Pray to the paw gods' })
  async pray(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const count = await store.incrBy(prayerKey(ctx.user.id), 1);
    await ctx.reply(tt(ctx, 'game:pray.done', { count }));
  }
}
