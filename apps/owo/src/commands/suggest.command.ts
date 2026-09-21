import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { TextOptionDto } from './dto/community.dto.js';

@Injectable()
@PlayerGuarded()
export class SuggestCommand {
  @Command({
    name: 'suggest',
    description: 'Post a suggestion with vote reactions',
    category: 'Utility',
    toggleable: true,
  })
  async suggest(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: TextOptionDto,
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:suggest.title'))
      .setDescription(dto.text)
      .setFooter({ text: tt(ctx, 'game:suggest.footer', { user: ctx.user.id }) });
    const message = await ctx.reply({ embeds: [embed], fetchReply: true });
    await message.react('👍');
    await message.react('👎');
  }
}
