import { Command, Context, Injectable } from '@discord.ts/common';
import type { ChatInputCommandInteraction } from 'discord.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

@Injectable()
@PlayerGuarded()
export class PingCommand {
  @Command({ name: 'ping', description: 'Check the bot round trip' })
  async ping(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const sent = await ctx.reply({ content: tt(ctx, 'game:ping.pinging'), fetchReply: true });
    const roundTrip = sent.createdTimestamp - ctx.createdTimestamp;
    const ws = ctx.client.ws.ping;
    await sent.edit(tt(ctx, 'game:ping.pong', { roundTrip, ws }));
  }
}
