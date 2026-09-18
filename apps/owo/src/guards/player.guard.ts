import { UseGuards, type CanActivate } from '@discord.ts/common';
import type { DiscordExecutionContext } from '@discord.ts/core';
import type { Store } from '@discord.ts/systems';
import { banOf } from '../game/bans.js';
import { store as appStore } from '../game/store.js';
import { tt } from '../game/text.js';
import { isPaused } from '../game/warns.js';
import { denyInteraction } from './deny.js';
import { EnabledGuard } from './enabled.guard.js';

/** Bot-level ban: a banned user cannot run player commands. */
export class BannedGuard implements CanActivate {
  constructor(private readonly store: Store = appStore) {}

  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const userId = interactionUserId(ix);
    if (!userId) return true;
    const ban = await banOf(this.store, userId);
    if (!ban) return true;
    await denyInteraction(ix, tt(ix, 'game:ban.blocked', { reason: ban.reason }));
    return false;
  }
}

/** Bot-wide pause: stops every player command while an operator fixes something. */
export class PausedGuard implements CanActivate {
  constructor(private readonly store: Store = appStore) {}

  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const userId = interactionUserId(ix);
    if (!userId) return true;
    if (!(await isPaused(this.store))) return true;
    await denyInteraction(ix, tt(ix, 'game:paused'));
    return false;
  }
}

/** Class or method decorator: guild toggle, bot ban list, and the bot-wide pause. */
export const PlayerGuarded = (): MethodDecorator & ClassDecorator =>
  UseGuards(EnabledGuard, BannedGuard, PausedGuard) as unknown as MethodDecorator & ClassDecorator;

function interactionUserId(ix: Record<string, unknown>): string | undefined {
  return (
    (ix['user'] as { id?: string } | undefined)?.id ??
    (ix['author'] as { id?: string } | undefined)?.id
  );
}
