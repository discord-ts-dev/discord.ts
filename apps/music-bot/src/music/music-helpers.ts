import type { ChatInputCommandInteraction, GuildMember, Message } from 'discord.js';
import { formatTime } from './format.js';

export type Ctx = ChatInputCommandInteraction | Message;

export const NON_PREMIUM_QUEUE_CAP = 25;

export function voiceChannelIdOf(ctx: Ctx): string | null {
  const member = ctx.member as GuildMember | null;
  return member?.voice?.channelId ?? null;
}

export function trackLine(track: {
  name: string;
  uri: string;
  duration: number;
  requesterId?: string;
}): string {
  const when = track.duration > 0 ? formatTime(track.duration) : 'LIVE';
  const who = track.requesterId ? ` <@${track.requesterId}>` : '';
  return `[${track.name}](${track.uri}) \`${when}\`${who}`;
}
