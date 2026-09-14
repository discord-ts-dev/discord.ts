import { describe, expect, test } from "bun:test";
import { MemoryStore } from "../src/index.js";

describe("MemoryStore strings", () => {
  test("get misses, set hits", async () => {
    const s = new MemoryStore();
    expect(await s.get("k")).toBeNull();
    await s.set("k", "v");
    expect(await s.get("k")).toBe("v");
  });

  test("ttl expires", async () => {
    const s = new MemoryStore();
    await s.set("k", "v", 20);
    expect(await s.get("k")).toBe("v");
    await Bun.sleep(40);
    expect(await s.get("k")).toBeNull();
  });

  test("incrBy from missing and existing", async () => {
    const s = new MemoryStore();
    expect(await s.incrBy("c", 5)).toBe(5);
    expect(await s.incrBy("c", -2)).toBe(3);
  });

  test("del removes", async () => {
    const s = new MemoryStore();
    await s.set("k", "v");
    await s.del("k");
    expect(await s.get("k")).toBeNull();
  });
});

describe("MemoryStore sorted sets", () => {
  test("zadd, zscore, zrank, zrange", async () => {
    const s = new MemoryStore();
    await s.zadd("lb", 10, "a");
    await s.zadd("lb", 30, "b");
    await s.zadd("lb", 20, "c");
    expect(await s.zscore("lb", "b")).toBe(30);
    expect(await s.zscore("lb", "x")).toBeNull();
    expect(await s.zrank("lb", "b", true)).toBe(0);
    expect(await s.zrank("lb", "a", true)).toBe(2);
    expect(await s.zrange("lb", 0, 1, true)).toEqual([
      { member: "b", score: 30 },
      { member: "c", score: 20 },
    ]);
    expect(await s.zrange("lb", 0, -1)).toEqual([
      { member: "a", score: 10 },
      { member: "c", score: 20 },
      { member: "b", score: 30 },
    ]);
  });

  test("zadd overwrites member score", async () => {
    const s = new MemoryStore();
    await s.zadd("lb", 10, "a");
    await s.zadd("lb", 99, "a");
    expect(await s.zscore("lb", "a")).toBe(99);
    expect(await s.zrange("lb", 0, -1, true)).toEqual([{ member: "a", score: 99 }]);
  });
});
