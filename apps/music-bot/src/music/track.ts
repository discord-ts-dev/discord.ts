/** One playable entry. Transport handles stay opaque inside the transport adapter. */
export interface Track {
  uri: string;
  name: string;
  duration: number;
  encode?: string;
  requesterId?: string;
  author?: string;
  artworkUrl?: string | null;
  isStream?: boolean;
  /** Transport handle. Only the transport adapter reads or writes it. */
  raw?: unknown;
}
