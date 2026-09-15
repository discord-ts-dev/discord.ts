import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { TaskRunner } from '../src/index.js';

describe('TaskRunner while running', () => {
  test('register after start schedules the task and names lists it', async () => {
    const runner = new TaskRunner();
    let runs = 0;
    runner.start();
    try {
      runner.register({ name: 'late', everyMs: 5, run: async () => void runs++ });
      assert.deepEqual(runner.names, ['late']);
      await new Promise((resolve) => setTimeout(resolve, 30));
      assert.ok(runs >= 1);
    } finally {
      runner.stop();
    }
  });

  test('stop clears timers so no further runs happen', async () => {
    let runs = 0;
    const runner = new TaskRunner([{ name: 'tick', everyMs: 5, run: async () => void runs++ }]);
    runner.start();
    await new Promise((resolve) => setTimeout(resolve, 15));
    runner.stop();
    const seen = runs;
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(runs, seen);
  });
});
