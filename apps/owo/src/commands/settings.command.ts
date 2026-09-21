import {
  Autocomplete,
  Command,
  Context,
  DISCORD_DISCOVERY,
  Inject,
  Injectable,
  Options,
} from '@discord.ts/common';
import { RequireGuild, RequirePermissions, type DiscordDiscoveryService } from '@discord.ts/core';
import { setCommandEnabled, toggleableNames } from '@discord.ts/systems';
import {
  MessageFlags,
  PermissionFlagsBits,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { ToggleDto } from './dto/owo.dto.js';

// Recipe: enable/disable choices come from the registry, not a hand-list.
// Discord caps static choices at 25, so the option is autocomplete-driven and
// answers from DiscordDiscoveryService.helpEntries().
async function respondToggleChoices(
  ix: AutocompleteInteraction,
  discovery: DiscordDiscoveryService,
): Promise<void> {
  const focused = ix.options.getFocused().toLowerCase();
  const names = toggleableNames(discovery.helpEntries()).filter((name) => name.includes(focused));
  await ix.respond(names.slice(0, 25).map((name) => ({ name: `/${name}`, value: name })));
}

@Injectable()
@RequireGuild()
export class SettingsCommand {
  constructor(@Inject(DISCORD_DISCOVERY) private readonly discovery: DiscordDiscoveryService) {}

  @Command({
    name: 'disable',
    description: 'Turn a command off in this server (manage server)',
    category: 'Settings',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async disable(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ToggleDto,
  ): Promise<void> {
    if (!toggleableNames(this.discovery.helpEntries()).includes(dto.command)) {
      await ctx.reply({
        content: tt(ctx, 'game:settings.unknown-command', { command: dto.command }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await setCommandEnabled(store, (ctx.guild as { id: string }).id, dto.command, false);
    await ctx.reply({
      content: tt(ctx, 'game:settings.disabled', { command: dto.command }),
      flags: MessageFlags.Ephemeral,
    });
  }

  @Command({
    name: 'enable',
    description: 'Turn a command back on in this server (manage server)',
    category: 'Settings',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async enable(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ToggleDto,
  ): Promise<void> {
    if (!toggleableNames(this.discovery.helpEntries()).includes(dto.command)) {
      await ctx.reply({
        content: tt(ctx, 'game:settings.unknown-command', { command: dto.command }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await setCommandEnabled(store, (ctx.guild as { id: string }).id, dto.command, true);
    await ctx.reply({
      content: tt(ctx, 'game:settings.enabled', { command: dto.command }),
      flags: MessageFlags.Ephemeral,
    });
  }

  @Autocomplete('disable')
  async disableChoices(@Context() ix: AutocompleteInteraction): Promise<void> {
    await respondToggleChoices(ix, this.discovery);
  }

  @Autocomplete('enable')
  async enableChoices(@Context() ix: AutocompleteInteraction): Promise<void> {
    await respondToggleChoices(ix, this.discovery);
  }
}
