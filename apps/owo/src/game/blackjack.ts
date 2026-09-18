export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  rank: Rank;
  suit: string;
}

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♥', '♦', '♣'];

// ponytail: cards draw with replacement instead of a shuffled shoe. Close
// enough for a chat game; swap in a shoe if counting ever matters.
export function drawCard(rand: () => number = Math.random): Card {
  const rank = RANKS[Math.floor(rand() * RANKS.length)] as Rank;
  const suit = SUITS[Math.floor(rand() * SUITS.length)] as string;
  return { rank, suit };
}

export function handValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === 'A') {
      aces++;
      total += 11;
    } else if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export function isNatural(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

export function dealerPlay(cards: Card[], rand: () => number = Math.random): Card[] {
  const out = [...cards];
  while (handValue(out) < 17) out.push(drawCard(rand));
  return out;
}

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose';

/** Payout multiplier on the bet: 0 lose, 1 push, 2 win, 2.5 natural. */
export function resolve(player: Card[], dealer: Card[]): { outcome: Outcome; payout: number } {
  const p = handValue(player);
  const d = handValue(dealer);
  if (p > 21) return { outcome: 'lose', payout: 0 };
  if (isNatural(player) && !isNatural(dealer)) return { outcome: 'blackjack', payout: 2.5 };
  if (isNatural(player) && isNatural(dealer)) return { outcome: 'push', payout: 1 };
  if (d > 21 || p > d) return { outcome: 'win', payout: 2 };
  if (p === d) return { outcome: 'push', payout: 1 };
  return { outcome: 'lose', payout: 0 };
}

export function cardText(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function handText(cards: Card[]): string {
  return cards.map(cardText).join(' ');
}
