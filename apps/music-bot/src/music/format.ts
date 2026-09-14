// ponytail: Shiroko Utils port (floor-math durations, block progress bar).
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m ${totalSeconds % 60}s`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours}h ${totalMinutes % 60}m`;
  return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
}

export function progressBar(current: number, total: number, size = 20): string {
  if (!total || total <= 0) return `${'░'.repeat(size)} 0%`;
  const ratio = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(ratio * size);
  return `${'▓'.repeat(filled)}${'░'.repeat(size - filled)} ${Math.round(ratio * 100)}%`;
}

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
