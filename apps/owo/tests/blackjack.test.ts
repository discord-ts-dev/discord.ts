import { describe, expect, test } from 'bun:test';
import {
  dealerPlay,
  drawCard,
  handValue,
  isNatural,
  RANKS,
  resolve,
  SUITS,
  type Card,
  type Rank,
} from '../src/game/blackjack.js';

const c = (rank: Rank, suit = '♠'): Card => ({ rank, suit });

describe('handValue', () => {
  test('counts number cards and faces', () => {
    expect(handValue([c('2'), c('10')])).toBe(12);
    expect(handValue([c('J'), c('Q'), c('K')])).toBe(30);
  });

  test('demotes aces only as far as needed', () => {
    expect(handValue([c('A'), c('K')])).toBe(21);
    expect(handValue([c('A'), c('A'), c('9')])).toBe(21);
    expect(handValue([c('A'), c('A'), c('A')])).toBe(13);
    expect(handValue([c('A'), c('A'), c('A'), c('K')])).toBe(13);
  });
});

describe('isNatural', () => {
  test('only two cards and 21', () => {
    expect(isNatural([c('A'), c('K')])).toBe(true);
    expect(isNatural([c('7'), c('7'), c('7')])).toBe(false);
    expect(isNatural([c('10'), c('9')])).toBe(false);
  });
});

describe('drawCard', () => {
  test('draws ranks and suits from the tables', () => {
    const card = drawCard();
    expect(SUITS).toContain(card.suit);
    expect(RANKS).toContain(card.rank);
    expect(drawCard(() => 0)).toEqual({ rank: 'A', suit: '♠' });
  });
});

describe('dealerPlay', () => {
  test('stands on 17 and up', () => {
    expect(dealerPlay([c('10'), c('7')], () => 0)).toHaveLength(2);
    expect(dealerPlay([c('A'), c('6')], () => 0)).toHaveLength(2);
  });

  test('hits below 17', () => {
    const played = dealerPlay([c('10'), c('6')], () => 0);
    expect(played.length).toBeGreaterThan(2);
    expect(handValue(played)).toBeGreaterThanOrEqual(17);
  });
});

describe('resolve', () => {
  test('player bust loses first', () => {
    expect(resolve([c('K'), c('Q'), c('5')], [c('2'), c('3')])).toEqual({
      outcome: 'lose',
      payout: 0,
    });
  });

  test('a natural pays 2.5x, but not against a dealer natural', () => {
    expect(resolve([c('A'), c('K')], [c('10'), c('8')])).toEqual({
      outcome: 'blackjack',
      payout: 2.5,
    });
    expect(resolve([c('A'), c('K')], [c('A'), c('Q')])).toEqual({
      outcome: 'push',
      payout: 1,
    });
  });

  test('shows and compares the totals', () => {
    expect(resolve([c('10'), c('10')], [c('10'), c('7')])).toEqual({ outcome: 'win', payout: 2 });
    expect(resolve([c('10'), c('7')], [c('10'), c('10')])).toEqual({ outcome: 'lose', payout: 0 });
    expect(resolve([c('10'), c('8')], [c('10'), c('8')])).toEqual({ outcome: 'push', payout: 1 });
  });

  test('dealer bust pays like a win', () => {
    expect(resolve([c('10'), c('2')], [c('10'), c('6'), c('K')])).toEqual({
      outcome: 'win',
      payout: 2,
    });
  });
});
