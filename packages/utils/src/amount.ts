export type AmountResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'invalid' | 'non-positive' | 'exceeds-balance' };

const SUFFIXES: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/** `100`, `1,000`, `2k`, `1.5m`, `all`/`max` (= balance). Floored to ints. */
export function parseAmount(raw: string, balance: number): AmountResult {
  const text = raw.trim().toLowerCase();
  if (text === 'all' || text === 'max') {
    const value = Math.floor(balance);
    return value > 0 ? { ok: true, value } : { ok: false, reason: 'non-positive' };
  }

  const match = /^(-?[\d,]+(?:\.\d+)?)([kmb])?$/.exec(text);
  if (!match) return { ok: false, reason: 'invalid' };
  const value = Math.floor(Number(match[1]?.replace(/,/g, '')) * (SUFFIXES[match[2] ?? ''] ?? 1));
  if (!Number.isFinite(value)) return { ok: false, reason: 'invalid' };
  if (value <= 0) return { ok: false, reason: 'non-positive' };
  if (value > balance) return { ok: false, reason: 'exceeds-balance' };
  return { ok: true, value };
}
