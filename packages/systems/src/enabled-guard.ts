import {
  COMMAND_GROUP_METADATA,
  COMMAND_METADATA,
  SUBCOMMAND_METADATA,
  type CommandGroupMeta,
  type CommandMeta,
  type SubcommandMeta,
} from '@discord.ts/common';
import { replyEphemeral } from '@discord.ts/ux';
import { isCommandEnabled } from './guild-settings.js';
import type { Store } from './store.js';

/** Build the deny text for a disabled command. Receives the interaction and command name. */
export type EnabledDeny = (ix: unknown, commandName: string) => string | Promise<string>;

export interface EnabledGuardOptions {
  deny?: EnabledDeny;
}

interface GuardContext {
  getArgByIndex(i: number): unknown;
  getHandler(): unknown;
  getClass(): unknown;
}

function readCtx(ctx: unknown): {
  ix: unknown;
  handler: object | undefined;
  cls: object | undefined;
} {
  if (typeof ctx !== 'object' || ctx === null)
    return { ix: ctx, handler: undefined, cls: undefined };
  const c = ctx as Partial<GuardContext>;
  const ix = typeof c.getArgByIndex === 'function' ? (c.getArgByIndex(0) as unknown) : ctx;
  const handler =
    typeof c.getHandler === 'function' ? (c.getHandler() as object | undefined) : undefined;
  const cls = typeof c.getClass === 'function' ? (c.getClass() as object | undefined) : undefined;
  return { ix, handler, cls };
}

/**
 * Guild-level toggle. Blocks a command when `setCommandEnabled` turned it off
 * in that guild. DMs and un-decorated handlers pass through. A subcommand
 * toggles by its class-level group name.
 *
 * Constructed with its Store so apps can override the deny text (e.g. i18n):
 * `new EnabledGuard(store, { deny: (ix, name) => tt(...) })`. Usable via
 * `@UseGuards(...)` as a configured instance. Structurally typed, no core dep.
 */
export class EnabledGuard {
  constructor(
    private readonly store: Store,
    private readonly opts: EnabledGuardOptions = {},
  ) {}

  async canActivate(ctx: unknown): Promise<boolean> {
    const { ix, handler, cls } = readCtx(ctx);
    const guild = (ix as Record<string, unknown> | null | undefined)?.['guild'] as
      | { id?: string }
      | null
      | undefined;
    if (!guild?.id) return true;
    // Whole groups toggle by their group name, so a subcommand reads its
    // class-level group metadata instead of its own.
    const sub = handler
      ? (Reflect.getMetadata(SUBCOMMAND_METADATA, handler) as SubcommandMeta | undefined)
      : undefined;
    const meta = sub
      ? cls
        ? (Reflect.getMetadata(COMMAND_GROUP_METADATA, cls) as CommandGroupMeta | undefined)
        : undefined
      : handler
        ? (Reflect.getMetadata(COMMAND_METADATA, handler) as CommandMeta | undefined)
        : undefined;
    if (!meta?.name) return true;
    if (await isCommandEnabled(this.store, guild.id, meta.name)) return true;
    const text = this.opts.deny
      ? await this.opts.deny(ix, meta.name)
      : `\`/${meta.name}\` is disabled in this server.`;
    await replyEphemeral(ix, text);
    return false;
  }
}
