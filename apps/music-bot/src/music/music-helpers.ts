import { formatTime } from '@discord.ts/utils';

export const NON_PREMIUM_QUEUE_CAP = 25;

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
