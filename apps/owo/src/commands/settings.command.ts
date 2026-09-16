import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import { setCommandEnabled } from '@discord.ts/systems';
import { MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import type { ToggleDto } from './dto/owo.dto.js';

@Injectable()
@RequireGuild()
export class SettingsCommand {
  @Command({ name: 'disable', description: 'Turn a command off in this server (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async disable(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ToggleDto,
  ): Promise<void> {
    await setCommandEnabled(store, (ctx.guild as { id: string }).id, dto.command, false);
    await ctx.reply({
      content: tt(ctx, 'game:settings.disabled', { command: dto.command }),
      flags: MessageFlags.Ephemeral,
    });
  }

  @Command({ name: 'enable', description: 'Turn a command back on in this server (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async enable(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ToggleDto,
  ): Promise<void> {
    await setCommandEnabled(store, (ctx.guild as { id: string }).id, dto.command, true);
    await ctx.reply({
      content: tt(ctx, 'game:settings.enabled', { command: dto.command }),
      flags: MessageFlags.Ephemeral,
    });
  }
}
