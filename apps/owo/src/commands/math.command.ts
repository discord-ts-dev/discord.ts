import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { evaluate } from '../game/math.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { MathDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class MathCommand {
  @Command({ name: 'math', description: 'Evaluate a math expression' })
  async math(@Context() ctx: ChatInputCommandInteraction, @Options() dto: MathDto): Promise<void> {
    const result = evaluate(dto.expression);
    if (!result.ok) {
      await ctx.reply({
        content: tt(ctx, `game:math.${result.reason}`),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:math.title'))
      .setDescription(`\`${dto.expression.trim()}\` = **${result.value}**`);
    await ctx.reply({ embeds: [embed] });
  }
}
