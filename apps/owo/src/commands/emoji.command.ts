import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import {
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Guild,
} from 'discord.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { EmojiDto } from './dto/community.dto.js';

const CUSTOM_EMOJI = /^<a?:(\w+):(\d+)>$/;

@Injectable()
@PlayerGuarded()
@RequireGuild()
export class EmojiCommand {
  @Command({
    name: 'emoji',
    description: 'Copy a custom emoji into this server (manage expressions)',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuildExpressions)
  async emoji(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: EmojiDto,
  ): Promise<void> {
    const match = CUSTOM_EMOJI.exec(dto.emoji.trim());
    if (!match) {
      await ctx.reply({ content: tt(ctx, 'game:emoji.bad'), flags: MessageFlags.Ephemeral });
      return;
    }
    const [, , id] = match;
    const animated = dto.emoji.startsWith('<a:');
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`cdn ${response.status}`);
      const attachment = Buffer.from(await response.arrayBuffer());
      const emoji = await (ctx.guild as Guild).emojis.create({
        attachment,
        name: dto.name,
      });
      await ctx.reply(tt(ctx, 'game:emoji.copied', { emoji: emoji.toString(), name: dto.name }));
    } catch {
      await ctx.reply({ content: tt(ctx, 'game:emoji.fail'), flags: MessageFlags.Ephemeral });
    }
  }
}
