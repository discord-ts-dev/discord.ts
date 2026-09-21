import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { userIdOf } from '@discord.ts/utils';
import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { cookieKey } from '../game/social.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { TargetDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class CookieCommand {
  @Command({
    name: 'cookie',
    description: 'Give a cookie to someone',
    category: 'Social',
    toggleable: true,
  })
  async cookie(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: TargetDto,
  ): Promise<void> {
    const target = userIdOf(dto.user);
    if (!target) {
      await ctx.reply({ content: tt(ctx, 'game:cookie.fail'), flags: MessageFlags.Ephemeral });
      return;
    }
    const count = await store.incrBy(cookieKey(target), 1);
    await ctx.reply(tt(ctx, 'game:cookie.done', { user: `<@${target}>`, count }));
  }
}
