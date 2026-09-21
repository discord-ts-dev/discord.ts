import {
  Command,
  Context,
  DISCORD_DISCOVERY,
  Inject,
  Injectable,
  Locale,
} from '@discord.ts/common';
import type { DiscordDiscoveryService } from '@discord.ts/core';
import { buildHelpFromRegistry } from '@discord.ts/systems';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { tt } from '../game/text.js';

@Injectable()
export class HelpCommand {
  constructor(@Inject(DISCORD_DISCOVERY) private readonly discovery: DiscordDiscoveryService) {}

  @Command({ name: 'help', description: 'Show the Paw command list', category: 'General' })
  async help(@Context() ctx: ChatInputCommandInteraction, @Locale() locale: string): Promise<void> {
    const sections = buildHelpFromRegistry(this.discovery.helpEntries(), { locale });
    // Discord caps an embed field value at 1024 chars; long sections continue
    // into nameless fields below their category.
    const fields = sections.flatMap((section) => {
      const lines = section.commands.map((cmd) => `**/${cmd.name}** — ${cmd.description}`);
      const chunks: string[] = [];
      let buffer = '';
      for (const line of lines) {
        if (buffer && buffer.length + 1 + line.length > 1024) {
          chunks.push(buffer);
          buffer = line;
        } else buffer = buffer ? `${buffer}\n${line}` : line;
      }
      if (buffer) chunks.push(buffer);
      return chunks.map((value, index) => ({
        name: index === 0 ? section.category : '\u200b',
        value,
      }));
    });
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:help.title'))
      .setFooter({ text: tt(ctx, 'game:help.footer') })
      .setFields(fields);
    await ctx.reply({ embeds: [embed] });
  }
}
