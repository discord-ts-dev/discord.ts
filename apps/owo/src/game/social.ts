/** Text transform: r and l become w, case preserved. */
export function owoify(text: string): string {
  return text.replace(/r/g, 'w').replace(/R/g, 'W').replace(/l/g, 'w').replace(/L/g, 'W');
}

export const EIGHTBALL_ANSWERS: string[] = [
  'It is certain.',
  'Without a doubt.',
  'Most likely.',
  'Signs point to yes.',
  'Ask again later.',
  'Cannot predict now.',
  'Do not count on it.',
  'My reply is no.',
  'Very doubtful.',
  'The stars say yes.',
  'Definitely not.',
  'Only if you bring snacks.',
];

export function eightball(
  rand: () => number = Math.random,
  answers: string[] = EIGHTBALL_ANSWERS,
): string {
  return answers[Math.floor(rand() * answers.length)] as string;
}

/** Stable 0..100 pairing. Same two ids always give the same number. */
export function shipPercent(a: string, b: string): number {
  const [x, y] = [a, b].sort() as [string, string];
  const text = `${x}:${y}`;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % 101;
}

/** Cookie gifts land here; one counter per receiver. */
export const cookieKey = (userId: string) => `cookie:${userId}`;
