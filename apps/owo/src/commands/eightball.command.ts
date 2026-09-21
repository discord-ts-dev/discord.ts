import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { eightball } from '../game/social.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { EightballDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class EightballCommand {
  @Command({
    name: 'eightball',
    description: 'Ask the magic 8 ball',
    category: 'Social',
    toggleable: true,
  })
  async eightball(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: EightballDto,
  ): Promise<void> {
    const answer = eightball();
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:eightball.title'))
      .setDescription(tt(ctx, 'game:eightball.answer', { question: dto.question, answer }));
    await ctx.reply({ embeds: [embed] });
  }
}
