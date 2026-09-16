import type { Store } from '@discord.ts/systems';

export interface BattleRecord {
  wins: number;
  losses: number;
}

const equipKey = (userId: string) => `equip:${userId}`;
const recordKey = (userId: string) => `record:${userId}`;

export async function equippedWeaponId(store: Store, userId: string): Promise<string | null> {
  return store.get(equipKey(userId));
}

export async function setEquippedWeapon(
  store: Store,
  userId: string,
  weaponId: string | null,
): Promise<void> {
  if (weaponId === null) await store.del(equipKey(userId));
  else await store.set(equipKey(userId), weaponId);
}

export async function recordOf(store: Store, userId: string): Promise<BattleRecord> {
  const raw = await store.get(recordKey(userId));
  return raw ? (JSON.parse(raw) as BattleRecord) : { wins: 0, losses: 0 };
}

export async function addRecord(store: Store, userId: string, won: boolean): Promise<void> {
  const record = await recordOf(store, userId);
  if (won) record.wins += 1;
  else record.losses += 1;
  await store.set(recordKey(userId), JSON.stringify(record));
}

/** Inventory item id for a weapon, shared by shop and equip checks. */
export function weaponItemId(weaponId: string): string {
  return `weapon-${weaponId}`;
}
