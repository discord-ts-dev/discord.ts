import { Command, Context, Injectable, Options } from '@discord.ts/common';
import type { ChatInputCommandInteraction } from 'discord.js';
import { owoify } from '../game/social.js';
import { GuildToggleable } from '../guards/enabled.guard.js';
import type { OwoifyDto } from './dto/owo.dto.js';

@Injectable()
@GuildToggleable()
export class OwoifyCommand {
  @Command({ name: 'owoify', description: 'Rewrite text in fluent owo' })
  async owoify(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: OwoifyDto,
  ): Promise<void> {
    await ctx.reply(owoify(dto.text));
  }
}
