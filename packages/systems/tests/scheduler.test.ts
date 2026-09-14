import { describe, expect, test } from 'bun:test';
import { TaskRunner, defineTask, msUntilDaily } from '../src/index.js';

describe('msUntilDaily', () => {
  test('later today', () => {
    const ms = msUntilDaily(new Date('2026-01-01T10:00:00Z'), { hour: 12, timeZone: 'UTC' });
    expect(ms).toBe(2 * 3_600_000);
  });

  test('already passed rolls to tomorrow', () => {
    const ms = msUntilDaily(new Date('2026-01-01T10:00:00Z'), { hour: 9, timeZone: 'UTC' });
    expect(ms).toBe(23 * 3_600_000);
  });

  test('exact minute boundary', () => {
    const ms = msUntilDaily(new Date('2026-01-01T12:00:00Z'), {
      hour: 12,
      minute: 30,
      timeZone: 'UTC',
    });
    expect(ms).toBe(30 * 60_000);
  });
});

describe('TaskRunner', () => {
  test('duplicate names throw', () => {
    const r = new TaskRunner();
    r.register(defineTask({ name: 'a', everyMs: 1000, run: () => {} }));
    expect(() => r.register(defineTask({ name: 'a', everyMs: 1000, run: () => {} }))).toThrow();
  });

  test('task without schedule throws', () => {
    const r = new TaskRunner();
    expect(() => r.register(defineTask({ name: 'a', run: () => {} }))).toThrow();
  });

  test('runNow runs and unknown name throws', async () => {
    const r = new TaskRunner();
    let n = 0;
    r.register(defineTask({ name: 'a', everyMs: 1000, run: () => void n++ }));
    await r.runNow('a');
    expect(n).toBe(1);
    expect(r.runNow('nope')).rejects.toThrow();
  });

  test('interval fires until stopped', async () => {
    const r = new TaskRunner();
    let n = 0;
    r.register(defineTask({ name: 'a', everyMs: 10, run: () => void n++ }));
    r.start();
    await Bun.sleep(55);
    r.stop();
    const after = n;
    expect(after).toBeGreaterThan(0);
    await Bun.sleep(30);
    expect(n).toBe(after);
  });

  test('overlapping runs never overlap', async () => {
    const r = new TaskRunner();
    let live = 0;
    let maxLive = 0;
    r.register(
      defineTask({
        name: 'a',
        everyMs: 5,
        run: async () => {
          live++;
          maxLive = Math.max(maxLive, live);
          await Bun.sleep(20);
          live--;
        },
      }),
    );
    r.start();
    await Bun.sleep(80);
    r.stop();
    expect(maxLive).toBe(1);
  });

  test('loop errors are captured, loop survives', async () => {
    const r = new TaskRunner();
    let n = 0;
    r.register(
      defineTask({
        name: 'a',
        everyMs: 10,
        run: () => {
          n++;
          if (n === 1) throw new Error('boom');
        },
      }),
    );
    r.start();
    await Bun.sleep(50);
    r.stop();
    expect(n).toBeGreaterThan(1);
    expect(r.getLastError('a')?.message).toBe('boom');
  });
});
