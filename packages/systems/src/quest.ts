import { dayIndex } from './scheduler.js';
import { keys } from './keys.js';
import type { Store } from './store.js';

export interface QuestState {
  id: string;
  progress: number;
  goal: number;
  done: boolean;
  day: number;
  rerolled: boolean;
}

export interface QuestWindow {
  timeZone?: string;
  now?: Date;
}

async function save(store: Store, userId: string, state: QuestState): Promise<void> {
  await store.set(keys.quest(userId), JSON.stringify(state));
}

function currentState(raw: string | null, today: number): QuestState | null {
  if (!raw) return null;
  const state = JSON.parse(raw) as QuestState;
  return state.day === today ? state : null;
}

async function read(store: Store, userId: string, w: QuestWindow): Promise<QuestState | null> {
  const today = dayIndex(w.now ?? new Date(), w.timeZone ?? 'UTC');
  return currentState(await store.get(keys.quest(userId)), today);
}

function pick(pool: string[], exclude?: string): string {
  const choices = exclude === undefined ? pool : pool.filter((q) => q !== exclude);
  const from = choices.length > 0 ? choices : pool;
  return from[Math.floor(Math.random() * from.length)] as string;
}

export async function getQuest(
  store: Store,
  userId: string,
  w: QuestWindow = {},
): Promise<QuestState | null> {
  return read(store, userId, w);
}

export async function assignQuest(
  store: Store,
  userId: string,
  pool: string[],
  opts: QuestWindow & { goal?: number } = {},
): Promise<QuestState> {
  const state: QuestState = {
    id: pick(pool),
    progress: 0,
    goal: opts.goal ?? 1,
    done: false,
    day: dayIndex(opts.now ?? new Date(), opts.timeZone ?? 'UTC'),
    rerolled: false,
  };
  await save(store, userId, state);
  return state;
}

export async function addProgress(
  store: Store,
  userId: string,
  n: number,
  w: QuestWindow = {},
): Promise<QuestState | null> {
  const today = dayIndex(w.now ?? new Date(), w.timeZone ?? 'UTC');
  const questKey = keys.quest(userId);
  return store.update<QuestState | null>([questKey], (current) => {
    const state = currentState(current[questKey], today);
    if (!state) return { result: null };
    state.progress += n;
    if (state.progress >= state.goal) state.done = true;
    return { result: state, writes: { [questKey]: JSON.stringify(state) } };
  });
}

export async function rerollQuest(
  store: Store,
  userId: string,
  pool: string[],
  w: QuestWindow = {},
): Promise<
  { ok: true; quest: QuestState } | { ok: false; reason: 'no-quest' | 'already-rerolled' }
> {
  const today = dayIndex(w.now ?? new Date(), w.timeZone ?? 'UTC');
  const questKey = keys.quest(userId);
  return store.update<
    { ok: true; quest: QuestState } | { ok: false; reason: 'no-quest' | 'already-rerolled' }
  >([questKey], (current) => {
    const state = currentState(current[questKey], today);
    if (!state) return { result: { ok: false, reason: 'no-quest' } };
    if (state.rerolled) return { result: { ok: false, reason: 'already-rerolled' } };
    state.id = pick(pool, state.id);
    state.progress = 0;
    state.done = false;
    state.rerolled = true;
    return { result: { ok: true, quest: state }, writes: { [questKey]: JSON.stringify(state) } };
  });
}

export async function completeQuest(
  store: Store,
  userId: string,
  w: QuestWindow = {},
): Promise<QuestState | null> {
  const today = dayIndex(w.now ?? new Date(), w.timeZone ?? 'UTC');
  const questKey = keys.quest(userId);
  return store.update<QuestState | null>([questKey], (current) => {
    const state = currentState(current[questKey], today);
    if (!state?.done) return { result: null };
    return { result: state, writes: { [questKey]: null } };
  });
}
