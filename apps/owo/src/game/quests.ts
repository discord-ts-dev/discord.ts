import {
  addProgress,
  assignQuest,
  completeQuest,
  getQuest,
  rerollQuest,
  type QuestState,
  type Store,
} from '@discord.ts/systems';

export interface QuestDef {
  goal: number;
  reward: number;
}

/** One goal size fits every quest so the pool stays pickable in one call. */
export const QUEST_GOAL = 5;

export const QUESTS: Record<string, QuestDef> = {
  hunt: { goal: QUEST_GOAL, reward: 300 },
  sell: { goal: QUEST_GOAL, reward: 400 },
  flip: { goal: QUEST_GOAL, reward: 250 },
};

export const QUEST_POOL = Object.keys(QUESTS);

/** Current quest, assigning a fresh one when the day window has none. */
export async function ensureQuest(store: Store, userId: string): Promise<QuestState> {
  const current = await getQuest(store, userId);
  if (current) return current;
  return assignQuest(store, userId, QUEST_POOL, { goal: QUEST_GOAL });
}

/** Advance the active quest only when the action matches its id. */
export async function advanceQuest(
  store: Store,
  userId: string,
  questId: string,
  n = 1,
): Promise<QuestState | null> {
  const current = await getQuest(store, userId);
  if (!current || current.id !== questId || current.done) return current;
  return addProgress(store, userId, n);
}

export async function reroll(store: Store, userId: string) {
  return rerollQuest(store, userId, QUEST_POOL);
}

/** Cash in a finished quest. Null when it is missing or unfinished. */
export async function claimQuest(
  store: Store,
  userId: string,
): Promise<{ state: QuestState; reward: number } | null> {
  const done = await completeQuest(store, userId);
  if (!done) return null;
  return { state: done, reward: QUESTS[done.id]?.reward ?? 0 };
}
