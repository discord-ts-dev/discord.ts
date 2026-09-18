import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import { EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { COLORS } from '../game/config.js';
import { rulesOf, setRules } from '../game/community.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { RulesDto } from './dto/community.dto.js';

@Injectable()
@PlayerGuarded()
@RequireGuild()
export class RulesCommand {
  @Command({ name: 'rules', description: 'Show this server rules' })
  async rules(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const guildId = (ctx.guild as { id: string }).id;
    const text = await rulesOf(store, guildId);
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:rules.title'))
      .setDescription(text ?? tt(ctx, 'game:rules.none'));
    await ctx.reply({ embeds: [embed] });
  }

  @Command({ name: 'setrules', description: 'Set this server rules (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async setrules(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: RulesDto,
  ): Promise<void> {
    await setRules(store, (ctx.guild as { id: string }).id, dto.text);
    await replyEphemeral(ctx, tt(ctx, 'game:rules.saved'));
  }
}
