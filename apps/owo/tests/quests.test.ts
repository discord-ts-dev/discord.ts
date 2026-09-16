import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { getQuest } from '@discord.ts/systems';
import {
  advanceQuest,
  claimQuest,
  ensureQuest,
  QUEST_GOAL,
  QUEST_POOL,
  QUESTS,
} from '../src/game/quests.js';
import { FileStore } from '../src/game/store.js';

function tempStore(): FileStore {
  return new FileStore(join(mkdtempSync(join(tmpdir(), 'owo-')), 'owo.json'));
}

describe('quest pool', () => {
  test('every quest has a positive reward and the shared goal', () => {
    expect(QUEST_POOL.length).toBeGreaterThan(0);
    for (const [id, def] of Object.entries(QUESTS)) {
      expect(id.length).toBeGreaterThan(0);
      expect(def.reward).toBeGreaterThan(0);
      expect(def.goal).toBe(QUEST_GOAL);
    }
  });
});

describe('quest flow', () => {
  test('ensureQuest assigns once and keeps the same quest on repeat', async () => {
    const store = tempStore();
    const first = await ensureQuest(store, '1');
    expect(QUEST_POOL).toContain(first.id);
    expect(first.progress).toBe(0);
    const second = await ensureQuest(store, '1');
    expect(second.id).toBe(first.id);
  });

  test('only progress for the active quest counts', async () => {
    const store = tempStore();
    const quest = await ensureQuest(store, '1');
    const wrong = QUEST_POOL.find((id) => id !== quest.id);
    expect(wrong).toBeDefined();
    const untouched = await advanceQuest(store, '1', wrong as string, 3);
    expect(untouched?.progress).toBe(0);
    const moved = await advanceQuest(store, '1', quest.id, 3);
    expect(moved?.progress).toBe(3);
  });

  test('reaching the goal marks the quest done and claim pays once', async () => {
    const store = tempStore();
    const quest = await ensureQuest(store, '1');
    expect(await claimQuest(store, '1')).toBeNull();
    await advanceQuest(store, '1', quest.id, QUEST_GOAL);
    const claimed = await claimQuest(store, '1');
    expect(claimed?.state.id).toBe(quest.id);
    expect(claimed?.reward).toBe(QUESTS[quest.id]?.reward);
    expect(await claimQuest(store, '1')).toBeNull();
    expect(await getQuest(store, '1')).toBeNull();
  });

  test('advanceQuest on a missing quest is null', async () => {
    const store = tempStore();
    expect(await advanceQuest(store, '1', 'hunt')).toBeNull();
  });
});
