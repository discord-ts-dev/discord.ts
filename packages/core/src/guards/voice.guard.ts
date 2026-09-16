import type { CanActivate } from '@discord.ts/common';
import { replyEphemeral, type EphemeralTarget } from '@discord.ts/ux';
import type { DiscordExecutionContext } from '../context/discord-execution-context.js';

interface VoiceState {
  voice?: { channelId?: string | null } | null;
}

function channelOf(ix: Record<string, unknown>): string | null {
  const member = ix['member'] as VoiceState | null | undefined;
  return member?.voice?.channelId ?? null;
}

function botChannelOf(ix: Record<string, unknown>): string | null {
  const guild = ix['guild'] as { members?: { me?: VoiceState | null } | null } | null | undefined;
  return guild?.members?.me?.voice?.channelId ?? null;
}

async function block(
  ix: Record<string, unknown> & EphemeralTarget,
  content: string,
): Promise<boolean> {
  await replyEphemeral(ix, content);
  return false;
}

// ponytail: structural voice reads, works for interactions and messages.
export class VoiceGuard implements CanActivate {
  constructor() {}
  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown> & EphemeralTarget>(0);
    if (channelOf(ix)) return true;
    return block(ix, 'Join a voice channel first.');
  }
}

export class SameVoiceGuard implements CanActivate {
  constructor() {}
  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown> & EphemeralTarget>(0);
    const mine = channelOf(ix);
    if (!mine) return block(ix, 'Join a voice channel first.');
    const bot = botChannelOf(ix);
    if (bot && bot !== mine) return block(ix, 'Join my voice channel to use this.');
    return true;
  }
}
