import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import { COMMANDS, main, usage, type CliDeps } from '../src/cli.js';

function harness(overrides: Partial<CliDeps> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const exits: number[] = [];
  const spawns: Array<[string, string[]]> = [];
  const deps: CliDeps = {
    cwd: '/app',
    exists: () => true,
    spawn: (runtime, args) => {
      spawns.push([runtime, args]);
      return { status: 0 };
    },
    out: (text) => out.push(text),
    err: (text) => err.push(text),
    exit: (code) => exits.push(code),
    ...overrides,
  };
  return { deps, out, err, exits, spawns };
}

describe('@discord.ts/cli', () => {
  test('usage lists every command', () => {
    const text = usage();
    assert.match(text, /Usage: discord <command>/);
    for (const name of Object.keys(COMMANDS)) assert.ok(text.includes(name), name);
  });

  test('no command prints usage and exits 1', () => {
    const { deps, out, exits } = harness();
    main(['node', 'cli.js'], deps);
    assert.equal(out.length, 1);
    assert.deepEqual(exits, [1]);
  });

  test('--help and -h print usage and exit 0', () => {
    for (const flag of ['--help', '-h']) {
      const { deps, out, exits } = harness();
      main(['node', 'cli.js', flag], deps);
      assert.equal(out.length, 1);
      assert.deepEqual(exits, [0]);
    }
  });

  test('unknown command reports and exits 1', () => {
    const { deps, err, exits } = harness();
    main(['node', 'cli.js', 'nope'], deps);
    assert.match(err[0] ?? '', /unknown command "nope"/);
    assert.deepEqual(exits, [1]);
  });

  test('command --help prints usage without spawning', () => {
    const { deps, out, exits, spawns } = harness();
    main(['node', 'cli.js', 'dev', '--help'], deps);
    assert.equal(out.length, 1);
    assert.deepEqual(exits, [0]);
    assert.deepEqual(spawns, []);
  });

  test('missing entry file reports and exits 1', () => {
    const { deps, err, exits } = harness({ exists: () => false });
    main(['node', 'cli.js', 'dev'], deps);
    assert.match(err[0] ?? '', /missing src\/main\.ts/);
    assert.deepEqual(exits, [1]);
  });

  test('missing build output hints at building', () => {
    const { deps, err } = harness({ exists: () => false });
    main(['node', 'cli.js', 'start'], deps);
    assert.match(err[0] ?? '', /after building/);
  });

  test('dev spawns bun on the TS entry with passthrough args', () => {
    const { deps, spawns, exits } = harness();
    main(['node', 'cli.js', 'dev', '--inspect'], deps);
    assert.deepEqual(spawns, [['bun', ['/app/src/main.ts', '--inspect']]]);
    assert.deepEqual(exits, [0]);
  });

  test('dev:shard appends the shards flag', () => {
    const { deps, spawns } = harness();
    main(['node', 'cli.js', 'dev:shard'], deps);
    assert.deepEqual(spawns, [['bun', ['/app/src/main.ts', '--shards']]]);
  });

  test('start spawns node on the built entry', () => {
    const { deps, spawns } = harness();
    main(['node', 'cli.js', 'start'], deps);
    assert.deepEqual(spawns, [['node', ['/app/dist/main.js']]]);
  });

  test('null spawn status exits 1', () => {
    const { deps, exits } = harness({ spawn: () => ({ status: null }) });
    main(['node', 'cli.js', 'dev'], deps);
    assert.deepEqual(exits, [1]);
  });
});
