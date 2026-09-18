import { Command, Context, Injectable, Options, StringOption } from '@discord.ts/common';
import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { parseDefinitions } from '../game/words.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

class WordDto {
  @StringOption({ name: 'word', description: 'Word to look up', required: true })
  word!: string;
}

@Injectable()
@PlayerGuarded()
export class DefineCommand {
  @Command({ name: 'define', description: 'Look up a word in the dictionary' })
  async define(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: WordDto,
  ): Promise<void> {
    const word = dto.word.trim().toLowerCase();
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!response.ok) throw new Error(`status ${response.status}`);
      const definitions = parseDefinitions(await response.json());
      if (!definitions.length) throw new Error('no definitions');
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(tt(ctx, 'game:define.title', { word }))
        .setDescription(
          definitions
            .slice(0, 3)
            .map(
              (definition) =>
                `**${definition.partOfSpeech}** — ${definition.text}${
                  definition.example ? `\n> ${definition.example}` : ''
                }`,
            )
            .join('\n\n'),
        );
      await ctx.reply({ embeds: [embed] });
    } catch {
      await ctx.reply({ content: tt(ctx, 'game:define.fail'), flags: MessageFlags.Ephemeral });
    }
  }
}
