// ponytail: seek parsing plus chunking. Durations and bars live in @discord.ts/utils.
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function parseSeek(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(trimmed);
  if (!match || match[0] === '') return null;
  const h = Number(match[1] ?? 0);
  const m = Number(match[2] ?? 0);
  const s = Number(match[3] ?? 0);
  return (h * 3600 + m * 60 + s) * 1000;
}
