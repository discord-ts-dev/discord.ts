import type { Store } from '@discord.ts/systems';

export interface BanRecord {
  reason: string;
  at: number;
}

const KEY = 'bans';

export async function bans(store: Store): Promise<Record<string, BanRecord>> {
  return JSON.parse((await store.get(KEY)) ?? '{}') as Record<string, BanRecord>;
}

export async function banOf(store: Store, userId: string): Promise<BanRecord | null> {
  return (await bans(store))[userId] ?? null;
}

export async function banUser(store: Store, userId: string, reason: string): Promise<BanRecord> {
  const record: BanRecord = { reason, at: Date.now() };
  const all = await bans(store);
  all[userId] = record;
  await store.set(KEY, JSON.stringify(all));
  return record;
}

export async function unbanUser(store: Store, userId: string): Promise<boolean> {
  const all = await bans(store);
  if (!(userId in all)) return false;
  delete all[userId];
  await store.set(KEY, JSON.stringify(all));
  return true;
}
