import { Inject, UseGuards, type CanActivate } from '@discord.ts/common';
import type { DiscordExecutionContext } from '@discord.ts/core';
import { EnabledGuard, STORE, type Store } from '@discord.ts/systems';
import { banOf } from '../game/bans.js';
import { replyEphemeral } from '@discord.ts/ux';
import { store as appStore } from '../game/store.js';
import { tt } from '../game/text.js';
import { isPaused } from '../game/warns.js';

/** Bot-level ban: a banned user cannot run player commands. */
export class BannedGuard implements CanActivate {
  constructor(@Inject(STORE) private readonly store: Store) {}

  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const userId = interactionUserId(ix);
    if (!userId) return true;
    const ban = await banOf(this.store, userId);
    if (!ban) return true;
    await replyEphemeral(ix, tt(ix, 'game:ban.blocked', { reason: ban.reason }));
    return false;
  }
}

/** Bot-wide pause: stops every player command while an operator fixes something. */
export class PausedGuard implements CanActivate {
  constructor(@Inject(STORE) private readonly store: Store) {}

  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const userId = interactionUserId(ix);
    if (!userId) return true;
    if (!(await isPaused(this.store))) return true;
    await replyEphemeral(ix, tt(ix, 'game:paused'));
    return false;
  }
}

/** Guild toggle instance: enforcement lives in systems `EnabledGuard`; the deny text stays app i18n. */
const enabledGuard = new EnabledGuard(appStore, {
  deny: (ix, name) => tt(ix, 'game:settings.command-disabled', { command: name }),
});

/** Class or method decorator: guild toggle, bot ban list, and the bot-wide pause. */
export const PlayerGuarded = (): MethodDecorator & ClassDecorator =>
  UseGuards(enabledGuard, BannedGuard, PausedGuard) as unknown as MethodDecorator & ClassDecorator;

function interactionUserId(ix: Record<string, unknown>): string | undefined {
  return (
    (ix['user'] as { id?: string } | undefined)?.id ??
    (ix['author'] as { id?: string } | undefined)?.id
  );
}
