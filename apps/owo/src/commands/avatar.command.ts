import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { UserTargetDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class AvatarCommand {
  @Command({ name: 'avatar', description: 'Show a user avatar' })
  async avatar(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: UserTargetDto,
  ): Promise<void> {
    const user = typeof dto.user === 'object' && dto.user ? dto.user : ctx.user;
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:avatar.title', { user: `<@${user.id}>` }))
      .setImage(user.displayAvatarURL({ size: 512 }));
    await ctx.reply({ embeds: [embed] });
  }
}
