// ponytail: pure draw, no client, no framework. `random` is injectable so games
// roll the same way in tests as they do in production.

/** One entry in a weighted pick: a candidate value and its relative chance. */
export interface Weighted<T> {
  value: T;
  weight: number;
}

/** Draw one value with probability proportional to its weight.
 * Weights must be finite; positive weights take part in the draw, the rest do not.
 * `random` returns a number in [0, 1). Returns `undefined` when nothing can be
 * drawn: empty input, or no weight that can take part. Never throws. */
export function weightedPick<T>(
  items: readonly Weighted<T>[],
  random: () => number = Math.random,
): T | undefined {
  let total = 0;
  for (const item of items) {
    if (item.weight > 0) total += item.weight;
  }
  const roll = random() * total;
  let cumulative = 0;
  for (const item of items) {
    if (item.weight > 0) {
      cumulative += item.weight;
      if (roll < cumulative) return item.value;
    }
  }
  return undefined;
}
