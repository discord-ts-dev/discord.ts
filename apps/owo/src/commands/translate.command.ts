import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { COLORS } from '../game/config.js';
import { parseTranslation } from '../game/words.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { TranslateDto } from './dto/community.dto.js';

@Injectable()
@PlayerGuarded()
export class TranslateCommand {
  @Command({ name: 'translate', description: 'Translate text between languages' })
  async translate(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: TranslateDto,
  ): Promise<void> {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        dto.text,
      )}&langpair=${dto.from ?? 'en'}|${dto.to}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const translated = parseTranslation(await response.json());
      if (!translated) throw new Error('empty translation');
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(tt(ctx, 'game:translate.title', { from: dto.from ?? 'en', to: dto.to }))
        .setDescription(translated);
      await ctx.reply({ embeds: [embed] });
    } catch {
      await replyEphemeral(ctx, tt(ctx, 'game:translate.fail'));
    }
  }
}
