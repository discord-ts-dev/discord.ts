import type { Store } from '@discord.ts/systems';

export interface Relation {
  spouse: string | null;
  pendingFrom: string | null;
  pendingTo: string | null;
}

export type RelationResult =
  | { ok: true }
  | { ok: false; reason: 'self' | 'already-married' | 'target-married' | 'already-pending' };

export type AcceptResult =
  | { ok: true }
  | { ok: false; reason: 'already-married' | 'no-proposal' | 'already-pending' };

export type DeclineResult = { ok: true } | { ok: false; reason: 'no-proposal' };

const key = (userId: string) => `rel:${userId}`;

export async function relation(store: Store, userId: string): Promise<Relation> {
  const raw = await store.get(key(userId));
  const parsed = raw ? (JSON.parse(raw) as Partial<Relation>) : {};
  return {
    spouse: parsed.spouse ?? null,
    pendingFrom: parsed.pendingFrom ?? null,
    pendingTo: parsed.pendingTo ?? null,
  };
}

async function save(store: Store, userId: string, rel: Relation): Promise<void> {
  await store.set(key(userId), JSON.stringify(rel));
}

export async function propose(store: Store, from: string, to: string): Promise<RelationResult> {
  if (from === to) return { ok: false, reason: 'self' };
  const [a, b] = await Promise.all([relation(store, from), relation(store, to)]);
  if (a.spouse) return { ok: false, reason: 'already-married' };
  if (b.spouse) return { ok: false, reason: 'target-married' };
  if (a.pendingTo) return { ok: false, reason: 'already-pending' };
  await save(store, to, { ...b, pendingFrom: from });
  await save(store, from, { ...a, pendingTo: to });
  return { ok: true };
}

export async function accept(store: Store, by: string, from: string): Promise<AcceptResult> {
  const [a, b] = await Promise.all([relation(store, by), relation(store, from)]);
  if (a.spouse || b.spouse) return { ok: false, reason: 'already-married' };
  // One pending action at a time: accepting while your own proposal is out
  // would orphan that proposal. Withdraw it first.
  if (a.pendingTo && a.pendingTo !== from) return { ok: false, reason: 'already-pending' };
  if (a.pendingFrom !== from || b.pendingTo !== by) {
    return { ok: false, reason: 'no-proposal' };
  }
  await save(store, by, { spouse: from, pendingFrom: null, pendingTo: null });
  await save(store, from, { spouse: by, pendingFrom: null, pendingTo: null });
  return { ok: true };
}

export async function decline(store: Store, by: string, from: string): Promise<DeclineResult> {
  const a = await relation(store, by);
  if (a.pendingFrom !== from) return { ok: false, reason: 'no-proposal' };
  const b = await relation(store, from);
  await save(store, by, { ...a, pendingFrom: null });
  await save(store, from, { ...b, pendingTo: b.pendingTo === by ? null : b.pendingTo });
  return { ok: true };
}

export async function divorce(
  store: Store,
  userId: string,
): Promise<{ ok: true; former: string } | { ok: false; reason: 'not-married' }> {
  const a = await relation(store, userId);
  if (!a.spouse) return { ok: false, reason: 'not-married' };
  const former = a.spouse;
  const b = await relation(store, former);
  await save(store, former, { ...b, spouse: null });
  await save(store, userId, { ...a, spouse: null });
  return { ok: true, former };
}
