import { Command, Context, Injectable, Options } from '@discord.ts/common';
import type { ChatInputCommandInteraction } from 'discord.js';
import { owoify } from '../game/social.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { OwoifyDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class OwoifyCommand {
  @Command({
    name: 'owoify',
    description: 'Rewrite text in fluent owo',
    category: 'Social',
    toggleable: true,
  })
  async owoify(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: OwoifyDto,
  ): Promise<void> {
    await ctx.reply(owoify(dto.text));
  }
}
