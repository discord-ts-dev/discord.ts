import { Command, Context, Injectable, Options } from '@discord-ts-dev/common';
import { getBalance } from '@discord-ts-dev/systems';
import { userIdOf } from '@discord-ts-dev/utils';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { UserTargetDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class BalanceCommand {
  @Command({
    name: 'balance',
    description: 'Show pawcoin balance',
    category: 'Economy',
    toggleable: true,
  })
  async balance(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: UserTargetDto,
  ): Promise<void> {
    const target = userIdOf(dto.user) ?? ctx.user.id;
    const balance = await getBalance(store, target);
    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(tt(ctx, 'game:balance.title', { user: `<@${target}>` }))
      .setDescription(tt(ctx, 'game:balance.line', { amount: fmt(balance) }));
    await ctx.reply({ embeds: [embed] });
  }
}
