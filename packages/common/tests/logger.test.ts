import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { DiscordLogger, discordLogger } from '../src/index.js';

function capture(run: () => void): string {
  const chunks: string[] = [];
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as never;
  process.stderr.write = ((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as never;
  try {
    run();
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
  return chunks.join('');
}

describe('DiscordLogger', () => {
  test('every level writes its message through signale', () => {
    const logger = new DiscordLogger('Probe');
    const levels = ['log', 'success', 'route', 'ready', 'warn', 'error', 'debug'] as const;
    for (const level of levels) {
      assert.match(
        capture(() => logger[level](`hello-${level}`)),
        new RegExp(`hello-${level}`),
      );
    }
  });

  test('defaults the scope and exports a singleton', () => {
    assert.ok(discordLogger instanceof DiscordLogger);
    assert.match(
      capture(() => new DiscordLogger().log('default-scope')),
      /default-scope/,
    );
  });
});
