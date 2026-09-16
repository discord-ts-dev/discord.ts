import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import { getBalance } from '@discord.ts/systems';
import { parseAmount } from '@discord.ts/utils';
import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { credit } from '../game/economy.js';
import { advanceQuest } from '../game/quests.js';
import { flip } from '../game/rng.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { GuildToggleable } from '../guards/enabled.guard.js';
import type { CoinflipDto } from './dto/owo.dto.js';

@Injectable()
@GuildToggleable()
export class CoinflipCommand {
  @Command({ name: 'coinflip', description: 'Bet pawcoins on a coin flip' })
  @Cooldown(3)
  async coinflip(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: CoinflipDto,
  ): Promise<void> {
    const userId = ctx.user.id;
    const balance = await getBalance(store, userId);
    const parsed = parseAmount(dto.amount, balance);
    if (!parsed.ok) {
      await ctx.reply({
        content: tt(ctx, `game:bet.${parsed.reason}`, { balance: fmt(balance) }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const choice = dto.choice === 'tails' ? 'tails' : 'heads';
    const result = flip();
    const won = result === choice;
    const next = await credit(store, userId, won ? parsed.value : -parsed.value);
    await advanceQuest(store, userId, 'flip');

    const embed = new EmbedBuilder()
      .setColor(won ? COLORS.success : COLORS.error)
      .setTitle(tt(ctx, 'game:coinflip.title'))
      .setDescription(
        tt(ctx, won ? 'game:coinflip.win' : 'game:coinflip.lose', {
          result,
          choice,
          amount: fmt(parsed.value),
        }),
      )
      .setFooter({ text: tt(ctx, 'game:coinflip.balance', { balance: fmt(next) }) });
    await ctx.reply({ embeds: [embed] });
  }
}
