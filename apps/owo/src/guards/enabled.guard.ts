import {
  COMMAND_GROUP_METADATA,
  COMMAND_METADATA,
  SUBCOMMAND_METADATA,
  type CanActivate,
  type CommandGroupMeta,
  type CommandMeta,
  type SubcommandMeta,
} from '@discord.ts/common';
import { isCommandEnabled, type Store } from '@discord.ts/systems';
import type { DiscordExecutionContext } from '@discord.ts/core';
import { store as appStore } from '../game/store.js';
import { tt } from '../game/text.js';
import { denyInteraction } from './deny.js';

/** Player-facing commands a guild may turn off with /disable. Admin and owner commands are not toggleable. */
export const TOGGLEABLE = [
  'hunt',
  'zoo',
  'profile',
  'level',
  'daily',
  'balance',
  'coinflip',
  'slots',
  'blackjack',
  'drop',
  'battle',
  'weapons',
  'top',
  'me',
  'shop',
  'sell',
  'dex',
  'quest',
  'lottery',
  'owoify',
  'eightball',
  'ship',
  'cookie',
  'pray',
  'marry',
  'accept',
  'decline',
  'divorce',
  'math',
  'avatar',
  'color',
  'ping',
  'invite',
  'checklist',
  'suggest',
  'survey',
  'rules',
  'vote',
  'patreon',
  'emoji',
  'memegen',
  'sacrifice',
  'upgrade',
  'autohunt',
  'beehive',
  'trade',
  'emote',
  'define',
  'translate',
] as const;

/**
 * Guild-level toggle. Blocks a command when `/disable` turned it off in that
 * guild. DMs and un-decorated handlers pass through.
 */
export class EnabledGuard implements CanActivate {
  constructor(private readonly store: Store = appStore) {}

  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const guild = ix['guild'] as { id?: string } | null | undefined;
    if (!guild?.id) return true;
    // Whole groups toggle by their group name, so a subcommand reads its
    // class-level group metadata instead of its own.
    const sub = Reflect.getMetadata(SUBCOMMAND_METADATA, context.getHandler() as object) as
      | SubcommandMeta
      | undefined;
    const meta = sub
      ? (Reflect.getMetadata(COMMAND_GROUP_METADATA, context.getClass() as object) as
          | CommandGroupMeta
          | undefined)
      : (Reflect.getMetadata(COMMAND_METADATA, context.getHandler() as object) as
          | CommandMeta
          | undefined);
    if (!meta?.name) return true;
    if (await isCommandEnabled(this.store, guild.id, meta.name)) return true;
    await denyInteraction(ix, tt(ix, 'game:settings.command-disabled', { command: meta.name }));
    return false;
  }
}
