import { describe, test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  COMMANDS,
  isEntry,
  main,
  mainIfEntry,
  processDeps,
  usage,
  type CliDeps,
} from '../src/cli.js';

function harness(overrides: Partial<CliDeps> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const exits: number[] = [];
  const spawns: string[][] = [];
  const deps: CliDeps = {
    cwd: '/app',
    exists: async () => true,
    spawn: (argv) => {
      spawns.push(argv);
      return { exitCode: 0 };
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

  test('no command prints usage and exits 1', async () => {
    const { deps, out, exits } = harness();
    await main(['bun', 'cli.js'], deps);
    assert.equal(out.length, 1);
    assert.deepEqual(exits, [1]);
  });

  test('--help and -h print usage and exit 0', async () => {
    for (const flag of ['--help', '-h']) {
      const { deps, out, exits } = harness();
      await main(['bun', 'cli.js', flag], deps);
      assert.equal(out.length, 1);
      assert.deepEqual(exits, [0]);
    }
  });

  test('unknown command reports and exits 1', async () => {
    const { deps, err, exits } = harness();
    await main(['bun', 'cli.js', 'nope'], deps);
    assert.match(err[0] ?? '', /unknown command "nope"/);
    assert.deepEqual(exits, [1]);
  });

  test('command --help prints usage without spawning', async () => {
    const { deps, out, exits, spawns } = harness();
    await main(['bun', 'cli.js', 'dev', '--help'], deps);
    assert.equal(out.length, 1);
    assert.deepEqual(exits, [0]);
    assert.deepEqual(spawns, []);
  });

  test('missing entry file reports and exits 1', async () => {
    const { deps, err, exits } = harness({ exists: async () => false });
    await main(['bun', 'cli.js', 'dev'], deps);
    assert.match(err[0] ?? '', /missing src\/main\.ts/);
    assert.deepEqual(exits, [1]);
  });

  test('missing build output hints at building', async () => {
    const { deps, err } = harness({ exists: async () => false });
    await main(['bun', 'cli.js', 'start'], deps);
    assert.match(err[0] ?? '', /after building/);
  });

  test('dev spawns the current runtime on the TS entry with passthrough args', async () => {
    const { deps, spawns, exits } = harness();
    await main(['bun', 'cli.js', 'dev', '--inspect'], deps);
    assert.deepEqual(spawns, [[process.execPath, '/app/src/main.ts', '--inspect']]);
    assert.deepEqual(exits, [0]);
  });

  test('dev:shard appends the shards flag', async () => {
    const { deps, spawns } = harness();
    await main(['bun', 'cli.js', 'dev:shard'], deps);
    assert.deepEqual(spawns, [[process.execPath, '/app/src/main.ts', '--shards']]);
  });

  test('start runs the built entry', async () => {
    const { deps, spawns } = harness();
    await main(['bun', 'cli.js', 'start'], deps);
    assert.deepEqual(spawns, [[process.execPath, '/app/dist/main.js']]);
  });

  test('null spawn exit code exits 1', async () => {
    const { deps, exits } = harness({ spawn: () => ({ exitCode: null }) });
    await main(['bun', 'cli.js', 'dev'], deps);
    assert.deepEqual(exits, [1]);
  });

  test('isEntry compares realpaths and tolerates a missing entry', () => {
    const self = Bun.fileURLToPath(import.meta.url);
    assert.equal(isEntry(undefined, import.meta.url), false);
    assert.equal(isEntry('/definitely/missing', import.meta.url), false);
    assert.equal(isEntry(self, import.meta.url), true);
  });

  test('mainIfEntry only runs main for the entry file', async () => {
    const self = Bun.fileURLToPath(import.meta.url);
    const first = harness();
    await mainIfEntry(['bun', self], import.meta.url, first.deps);
    assert.equal(first.out.length, 1);
    const second = harness();
    await mainIfEntry(['bun', '/somewhere/else.js'], import.meta.url, second.deps);
    assert.deepEqual(second.out, []);
  });

  test('processDeps wires real side effects', async () => {
    const deps = processDeps();
    const prevExitCode = process.exitCode;
    const origOut = Bun.stdout.write.bind(Bun.stdout);
    const origErr = Bun.stderr.write.bind(Bun.stderr);
    const seen: string[] = [];
    Bun.stdout.write = ((chunk: string) => {
      seen.push(String(chunk));
      return 0;
    }) as never;
    Bun.stderr.write = ((chunk: string) => {
      seen.push(String(chunk));
      return 0;
    }) as never;
    try {
      assert.equal(deps.cwd, process.cwd());
      assert.equal(await deps.exists('/definitely/missing'), false);
      assert.equal(await deps.exists(import.meta.url.replace('file://', '')), true);
      deps.out('a');
      deps.err('b');
      const run = deps.spawn([process.execPath, '-e', 'process.exit(7)']);
      assert.equal(run.exitCode, 7);
      deps.exit(3);
      assert.equal(process.exitCode, 3);
    } finally {
      Bun.stdout.write = origOut;
      Bun.stderr.write = origErr;
      process.exitCode = prevExitCode ?? 0;
    }
    assert.deepEqual(seen, ['a', 'b']);
  });
});
