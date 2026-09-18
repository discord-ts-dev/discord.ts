/** Game balance knobs. One place to tune the loop after playing it. */
export const GAME = {
  huntCooldownSeconds: 12,
  catchChance: 0.6,
  huntXp: 5,
  dailyXp: 50,
  dailyAmount: 500,
  dailyStreakBonus: 50,
  dailyTimeZone: 'UTC',
  lotteryTicketPrice: 250,
  lotteryIntervalMs: 3_600_000,
} as const;

export interface ShopItemDef {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const SHOP_ITEMS: ShopItemDef[] = [
  {
    id: 'lootbox',
    name: 'Lootbox',
    price: 1000,
    description: 'Use it to reveal a random animal for your zoo.',
  },
  {
    id: 'title-star',
    name: 'Star Title',
    price: 5000,
    description: 'Use it to wear the ★ Star title on your profile.',
  },
];

/** Item id -> profile title. Only titles bought and used show up. */
export const TITLES: Record<string, string> = {
  'title-star': '★ Star',
};

export const COLORS = {
  success: 0x57f287,
  info: 0x5865f2,
  gold: 0xfee75c,
  error: 0xed4245,
} as const;
