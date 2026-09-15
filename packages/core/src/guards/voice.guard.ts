import type { CanActivate } from '@discord.ts/common';
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

async function block(ix: Record<string, unknown>, content: string): Promise<boolean> {
  try {
    const reply = ix['reply'] as ((msg: unknown) => Promise<unknown>) | undefined;
    if (typeof reply === 'function' && !ix['replied'] && !ix['deferred'])
      await (reply as (m: unknown) => Promise<unknown>).call(ix, { content, ephemeral: true });
  } catch {
    // ignore, handler already blocked
  }
  return false;
}

// ponytail: structural voice reads, works for interactions and messages.
export class VoiceGuard implements CanActivate {
  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    if (channelOf(ix)) return true;
    return block(ix, 'Join a voice channel first.');
  }
}

export class SameVoiceGuard implements CanActivate {
  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const ix = context.getArgByIndex<Record<string, unknown>>(0);
    const mine = channelOf(ix);
    if (!mine) return block(ix, 'Join a voice channel first.');
    const bot = botChannelOf(ix);
    if (bot && bot !== mine) return block(ix, 'Join my voice channel to use this.');
    return true;
  }
}
