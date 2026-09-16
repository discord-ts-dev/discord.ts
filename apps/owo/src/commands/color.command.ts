import { Command, Context, Injectable } from '@discord.ts/common';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

@Injectable()
@PlayerGuarded()
export class ColorCommand {
  @Command({ name: 'color', description: 'Show a random color' })
  async color(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const value = Math.floor(Math.random() * 0xffffff);
    const hex = `#${value.toString(16).padStart(6, '0').toUpperCase()}`;
    const embed = new EmbedBuilder()
      .setColor(value)
      .setTitle(tt(ctx, 'game:color.title'))
      .setDescription(`**${hex}**`);
    await ctx.reply({ embeds: [embed] });
  }
}
