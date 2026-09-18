export interface Emote {
  id: string;
  emoji: string;
  verb: string;
  /** Whether the emote needs a target user. */
  target: boolean;
}

export const EMOTES: Emote[] = [
  { id: 'hug', emoji: '🤗', verb: 'hugs', target: true },
  { id: 'pat', emoji: '🫳', verb: 'pats', target: true },
  { id: 'kiss', emoji: '😘', verb: 'kisses', target: true },
  { id: 'slap', emoji: '✋', verb: 'slaps', target: true },
  { id: 'poke', emoji: '👉', verb: 'pokes', target: true },
  { id: 'highfive', emoji: '🙌', verb: 'high-fives', target: true },
  { id: 'cry', emoji: '😭', verb: 'cries', target: false },
  { id: 'dance', emoji: '💃', verb: 'dances', target: false },
  { id: 'wave', emoji: '👋', verb: 'waves', target: false },
  { id: 'shrug', emoji: '🤷', verb: 'shrugs', target: false },
];

export function emoteById(id: string): Emote | undefined {
  return EMOTES.find((emote) => emote.id === id);
}
