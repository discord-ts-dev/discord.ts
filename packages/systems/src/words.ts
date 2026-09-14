const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function matcher(words: string[]): RegExp | null {
  if (words.length === 0) return null;
  return new RegExp(`\\b(?:${words.map(escape).join("|")})\\b`, "gi");
}

export function containsBlocked(text: string, words: string[]): boolean {
  return matcher(words)?.test(text) ?? false;
}

export function maskBlocked(text: string, words: string[], mask = "***"): string {
  const re = matcher(words);
  return re ? text.replace(re, mask) : text;
}
