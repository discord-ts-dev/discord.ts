import { weightedPick, type Weighted } from '@discord.ts/utils';

export interface SlotSymbol {
  id: string;
  emoji: string;
  weight: number;
  /** Payout multiplier for three of a kind. */
  three: number;
  /** Payout multiplier for a leading pair. */
  two: number;
}

// ponytail: hand-tuned so the expected multiplier stays under 1. The table is
// asserted in tests; retune both together.
export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 'cherry', emoji: '🍒', weight: 40, three: 5, two: 1 },
  { id: 'lemon', emoji: '🍋', weight: 30, three: 8, two: 1 },
  { id: 'bell', emoji: '🔔', weight: 18, three: 12, two: 2 },
  { id: 'diamond', emoji: '💎', weight: 10, three: 25, two: 3 },
  { id: 'seven', emoji: '7️⃣', weight: 2, three: 100, two: 5 },
];

export const SLOT_REELS = 3;

const SYMBOL_WEIGHTS: Weighted<SlotSymbol>[] = SLOT_SYMBOLS.map((symbol) => ({
  value: symbol,
  weight: symbol.weight,
}));

export function spinSlot(rand: () => number = Math.random): SlotSymbol[] {
  // A [0,1) roll over five positive weights always lands; the fallback keeps a
  // retuned all-zero table on the cheapest symbol instead of an undefined reel.
  const pick = (): SlotSymbol => weightedPick(SYMBOL_WEIGHTS, rand) ?? SYMBOL_WEIGHTS[0].value;
  return Array.from({ length: SLOT_REELS }, pick);
}

/** Multiplier for a spin result: triple pays `three`, leading pair pays `two`. */
export function slotMultiplier(reels: string[], symbols = SLOT_SYMBOLS): number {
  const defs = reels.map((id) => symbols.find((s) => s.id === id));
  const [first] = reels;
  if (defs.some((d) => !d) || first === undefined) return 0;
  if (reels.every((id) => id === first)) return (defs[0] as SlotSymbol).three;
  if (reels[1] === first) return (defs[0] as SlotSymbol).two;
  return 0;
}
