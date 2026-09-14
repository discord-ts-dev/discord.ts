import { describe, expect, test } from "bun:test";
import {
  MemoryStore,
  addBalance,
  addProgress,
  addScore,
  assignQuest,
  awardVote,
  buy,
  claimDaily,
  completeQuest,
  getBalance,
  getQuest,
  inventory,
  rankOf,
  rerollQuest,
  top,
  useItem,
} from "../src/index.js";

const UTC = "UTC";
const day = (iso: string) => new Date(iso);

describe("daily + streak", () => {
  test("first claim starts streak at one", async () => {
    const s = new MemoryStore();
    const r = await claimDaily(s, "u", { amount: 100, streakBonus: 10, timeZone: UTC, now: day("2026-01-01T10:00:00Z") });
    expect(r).toEqual({ claimed: true, amount: 100, streak: 1 });
    expect(await getBalance(s, "u")).toBe(100);
  });

  test("second claim same window is refused", async () => {
    const s = new MemoryStore();
    const opts = { amount: 100, timeZone: UTC, now: day("2026-01-01T10:00:00Z") };
    await claimDaily(s, "u", opts);
    const r = await claimDaily(s, "u", opts);
    expect(r.claimed).toBe(false);
    expect(await getBalance(s, "u")).toBe(100);
  });

  test("next window grows streak and payout", async () => {
    const s = new MemoryStore();
    await claimDaily(s, "u", { amount: 100, streakBonus: 10, timeZone: UTC, now: day("2026-01-01T10:00:00Z") });
    const r = await claimDaily(s, "u", { amount: 100, streakBonus: 10, timeZone: UTC, now: day("2026-01-02T10:00:00Z") });
    expect(r).toEqual({ claimed: true, amount: 110, streak: 2 });
  });

  test("missed window resets streak", async () => {
    const s = new MemoryStore();
    await claimDaily(s, "u", { amount: 100, streakBonus: 10, timeZone: UTC, now: day("2026-01-01T10:00:00Z") });
    const r = await claimDaily(s, "u", { amount: 100, streakBonus: 10, timeZone: UTC, now: day("2026-01-05T10:00:00Z") });
    expect(r.streak).toBe(1);
    expect(r.amount).toBe(100);
  });
});

describe("leaderboard", () => {
  test("add, top, rank", async () => {
    const s = new MemoryStore();
    await addScore(s, "rich", "a", 10);
    await addScore(s, "rich", "b", 30);
    await addScore(s, "rich", "c", 20);
    expect(await top(s, "rich", 2)).toEqual([
      { member: "b", score: 30 },
      { member: "c", score: 20 },
    ]);
    expect(await rankOf(s, "rich", "c")).toEqual({ rank: 2, score: 20 });
    expect(await rankOf(s, "rich", "x")).toBeNull();
  });
});

describe("quest", () => {
  test("assign, progress, complete", async () => {
    const s = new MemoryStore();
    const w = { timeZone: UTC, now: day("2026-01-01T10:00:00Z") };
    const q = await assignQuest(s, "u", ["hunt5", "win3"], { ...w, goal: 2 });
    expect(["hunt5", "win3"]).toContain(q.id);
    expect(await getQuest(s, "u", w)).not.toBeNull();
    expect((await addProgress(s, "u", 1, w))?.done).toBe(false);
    expect((await addProgress(s, "u", 1, w))?.done).toBe(true);
    const done = await completeQuest(s, "u", w);
    expect(done?.id).toBe(q.id);
    expect(await getQuest(s, "u", w)).toBeNull();
  });

  test("reroll once per window", async () => {
    const s = new MemoryStore();
    const now = day("2026-01-01T10:00:00Z");
    await assignQuest(s, "u", ["a", "b", "c"], { timeZone: UTC, now });
    const first = await rerollQuest(s, "u", ["a", "b", "c"], { timeZone: UTC, now });
    expect(first.ok).toBe(true);
    const second = await rerollQuest(s, "u", ["a", "b", "c"], { timeZone: UTC, now });
    expect(second).toEqual({ ok: false, reason: "already-rerolled" });
  });

  test("progress without quest is null", async () => {
    const s = new MemoryStore();
    expect(await addProgress(s, "u", 1)).toBeNull();
  });
});

describe("shop", () => {
  test("buy deducts and stocks inventory", async () => {
    const s = new MemoryStore();
    await addBalance(s, "u", 500);
    const r = await buy(s, "u", { id: "lootbox", price: 200 }, 2);
    expect(r).toEqual({ ok: true, balance: 100, qty: 2 });
    expect(await inventory(s, "u")).toEqual({ lootbox: 2 });
  });

  test("buy refuses insufficient funds and bad qty", async () => {
    const s = new MemoryStore();
    await addBalance(s, "u", 50);
    expect((await buy(s, "u", { id: "x", price: 200 })).ok).toBe(false);
    expect((await buy(s, "u", { id: "x", price: 10 }, 0 )).ok).toBe(false);
    expect(await getBalance(s, "u")).toBe(50);
  });

  test("useItem consumes stock", async () => {
    const s = new MemoryStore();
    await addBalance(s, "u", 500);
    await buy(s, "u", { id: "lootbox", price: 200 }, 2);
    expect(await useItem(s, "u", "lootbox")).toBe(true);
    expect(await useItem(s, "u", "missing")).toBe(false);
    expect(await useItem(s, "u", "lootbox", 0)).toBe(false);
    expect(await useItem(s, "u", "lootbox", -1)).toBe(false);
    expect(await inventory(s, "u")).toEqual({ lootbox: 1 });
  });
});

describe("vote", () => {
  test("awardVote tops up balance", async () => {
    const s = new MemoryStore();
    const balance = await awardVote(s, "u", 250);
    expect(balance).toBe(250);
    expect(await getBalance(s, "u")).toBe(250);
  });
});
