import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { userIdOf, progressBar } from '@discord.ts/utils';
import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { shipPercent } from '../game/social.js';
import { tt } from '../game/text.js';
import { GuildToggleable } from '../guards/enabled.guard.js';
import type { ShipDto } from './dto/owo.dto.js';

@Injectable()
@GuildToggleable()
export class ShipCommand {
  @Command({ name: 'ship', description: 'Measure the love between two users' })
  async ship(@Context() ctx: ChatInputCommandInteraction, @Options() dto: ShipDto): Promise<void> {
    const first = userIdOf(dto.first);
    const second = userIdOf(dto.second);
    if (!first || !second) {
      await ctx.reply({
        content: tt(ctx, 'game:ship.fail'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const percent = shipPercent(first, second);
    const embed = new EmbedBuilder()
      .setColor(percent >= 50 ? COLORS.success : COLORS.error)
      .setTitle(tt(ctx, 'game:ship.title'))
      .setDescription(
        tt(ctx, 'game:ship.result', {
          a: `<@${first}>`,
          b: `<@${second}>`,
          percent,
          bar: progressBar(percent, 100),
        }),
      );
    await ctx.reply({ embeds: [embed] });
  }
}
