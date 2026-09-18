import type { Store } from '@discord.ts/systems';

export type PremiumTier = 'free' | 'supporter' | 'patron';

export const TIERS: PremiumTier[] = ['free', 'supporter', 'patron'];

export const TIER_PERKS: Record<PremiumTier, string[]> = {
  free: [],
  supporter: ['daily payout x2'],
  patron: ['daily payout x2', 'shop prices -10%'],
};

const TIER_SET: ReadonlySet<string> = new Set(TIERS);

const key = (userId: string) => `premium:${userId}`;

export function isPremiumTier(value: string): value is PremiumTier {
  return TIER_SET.has(value);
}

export async function premiumTierOf(store: Store, userId: string): Promise<PremiumTier> {
  const raw = await store.get(key(userId));
  return raw && isPremiumTier(raw) ? raw : 'free';
}

export async function setPremiumTier(
  store: Store,
  userId: string,
  tier: PremiumTier,
): Promise<void> {
  if (tier === 'free') await store.del(key(userId));
  else await store.set(key(userId), tier);
}

export function dailyMultiplier(tier: PremiumTier): number {
  return tier === 'free' ? 1 : 2;
}

export function shopPrice(price: number, tier: PremiumTier): number {
  return tier === 'patron' ? Math.max(1, Math.floor(price * 0.9)) : price;
}
