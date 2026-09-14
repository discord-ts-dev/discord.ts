import { dayIndex } from "./scheduler.js";
import type { Store } from "./store.js";

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

const questKey = (userId: string) => `quest:${userId}`;

async function save(store: Store, userId: string, state: QuestState): Promise<void> {
  await store.set(questKey(userId), JSON.stringify(state));
}

async function read(store: Store, userId: string, w: QuestWindow): Promise<QuestState | null> {
  const raw = await store.get(questKey(userId));
  if (!raw) return null;
  const state = JSON.parse(raw) as QuestState;
  const today = dayIndex(w.now ?? new Date(), w.timeZone ?? "UTC");
  return state.day === today ? state : null;
}

function pick(pool: string[], exclude?: string): string {
  const choices = exclude === undefined ? pool : pool.filter((q) => q !== exclude);
  const from = choices.length > 0 ? choices : pool;
  return from[Math.floor(Math.random() * from.length)] as string;
}

export async function getQuest(store: Store, userId: string, w: QuestWindow = {}): Promise<QuestState | null> {
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
    day: dayIndex(opts.now ?? new Date(), opts.timeZone ?? "UTC"),
    rerolled: false,
  };
  await save(store, userId, state);
  return state;
}

export async function addProgress(store: Store, userId: string, n: number, w: QuestWindow = {}): Promise<QuestState | null> {
  const state = await read(store, userId, w);
  if (!state) return null;
  state.progress += n;
  if (state.progress >= state.goal) state.done = true;
  await save(store, userId, state);
  return state;
}

export async function rerollQuest(
  store: Store,
  userId: string,
  pool: string[],
  w: QuestWindow = {},
): Promise<{ ok: true; quest: QuestState } | { ok: false; reason: "no-quest" | "already-rerolled" }> {
  const state = await read(store, userId, w);
  if (!state) return { ok: false, reason: "no-quest" };
  if (state.rerolled) return { ok: false, reason: "already-rerolled" };
  state.id = pick(pool, state.id);
  state.progress = 0;
  state.done = false;
  state.rerolled = true;
  await save(store, userId, state);
  return { ok: true, quest: state };
}

export async function completeQuest(store: Store, userId: string, w: QuestWindow = {}): Promise<QuestState | null> {
  const state = await read(store, userId, w);
  if (!state?.done) return null;
  await store.del(questKey(userId));
  return state;
}
