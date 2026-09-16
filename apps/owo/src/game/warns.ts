import type { Store } from '@discord.ts/systems';

export interface WarnRecord {
  reason: string;
  at: number;
}

const KEY = 'warns';
const PAUSE_KEY = 'paused';

export async function warningsOf(store: Store, userId: string): Promise<WarnRecord[]> {
  const all = JSON.parse((await store.get(KEY)) ?? '{}') as Record<string, WarnRecord[]>;
  return all[userId] ?? [];
}

export async function warnUser(
  store: Store,
  userId: string,
  reason: string,
): Promise<WarnRecord[]> {
  const all = JSON.parse((await store.get(KEY)) ?? '{}') as Record<string, WarnRecord[]>;
  const list = [...(all[userId] ?? []), { reason, at: Date.now() }];
  all[userId] = list;
  await store.set(KEY, JSON.stringify(all));
  return list;
}

export async function isPaused(store: Store): Promise<boolean> {
  return (await store.get(PAUSE_KEY)) === '1';
}

export async function setPaused(store: Store, paused: boolean): Promise<void> {
  if (paused) await store.set(PAUSE_KEY, '1');
  else await store.del(PAUSE_KEY);
}
