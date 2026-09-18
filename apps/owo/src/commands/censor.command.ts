import {
  Context,
  Injectable,
  Options,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import { PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { censorWord, censoredWords, uncensorWord } from '../game/community.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import type { CensorWordDto } from './dto/community.dto.js';

const Censor = createCommandGroupDecorator({
  name: 'censor',
  description: 'Guild word filter: add, remove, or list words',
});

@Injectable()
@RequireGuild()
@Censor()
export class CensorCommand {
  @Subcommand({ name: 'add', description: 'Add a word to the filter (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async add(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: CensorWordDto,
  ): Promise<void> {
    const words = await censorWord(store, (ctx.guild as { id: string }).id, dto.word);
    await ctx.reply(tt(ctx, 'game:censor.added', { word: dto.word, count: words.length }));
  }

  @Subcommand({ name: 'remove', description: 'Remove a word from the filter (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async remove(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: CensorWordDto,
  ): Promise<void> {
    const words = await uncensorWord(store, (ctx.guild as { id: string }).id, dto.word);
    await ctx.reply(tt(ctx, 'game:censor.removed', { word: dto.word, count: words.length }));
  }

  @Subcommand({ name: 'list', description: 'Show the filter words (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async list(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const words = await censoredWords(store, (ctx.guild as { id: string }).id);
    await ctx.reply(
      words.length
        ? tt(ctx, 'game:censor.list', { words: words.join(', ') })
        : tt(ctx, 'game:censor.empty'),
    );
  }
}
