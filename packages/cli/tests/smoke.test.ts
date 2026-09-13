// ponytail: smoke test only, proves bun test wiring (no cli import: entry runs on load)
import assert from 'node:assert';
import { describe, test } from 'node:test';

describe('@discord.ts/cli', () => {
  test('package name', async () => {
    const pkg = (await import('../package.json')) as { name: string };
    assert.equal(pkg.name, '@discord.ts/cli');
  });
});
