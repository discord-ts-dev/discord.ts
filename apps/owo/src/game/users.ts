import type { Store } from '@discord.ts/systems';

const USERS_KEY = 'users';
// ponytail: bounded index, FIFO evict. One write per new user, not per
// interaction. A real user table belongs in SQL when the list outgrows one key.
const MAX_KNOWN_USERS = 10_000;

export async function knownUsers(store: Store): Promise<string[]> {
  const raw = await store.get(USERS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function rememberUser(
  store: Store,
  userId: string,
  cap: number = MAX_KNOWN_USERS,
): Promise<void> {
  const users = await knownUsers(store);
  if (users.includes(userId)) return;
  users.push(userId);
  while (users.length > cap) users.shift();
  await store.set(USERS_KEY, JSON.stringify(users));
}
