#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface CliCommand {
  file: string;
  runtime: 'bun' | 'node';
  args: string[];
  help: string;
}

// ponytail: no arg-parser dep, five commands fit in one table.
export const COMMANDS: Record<string, CliCommand> = {
  dev: { file: 'src/main.ts', runtime: 'bun', args: [], help: 'boot bot from TS source' },
  'dev:shard': {
    file: 'src/main.ts',
    runtime: 'bun',
    args: ['--shards'],
    help: 'boot shards from TS source',
  },
  deploy: { file: 'src/deploy.ts', runtime: 'bun', args: [], help: 'sync commands without login' },
  start: { file: 'dist/main.js', runtime: 'node', args: [], help: 'boot bot from build output' },
  'start:shard': {
    file: 'dist/main.js',
    runtime: 'node',
    args: ['--shards'],
    help: 'boot shards from build output',
  },
};

/** Side effects `main` needs, injectable so tests never spawn or exit. */
export interface CliDeps {
  cwd: string;
  exists: (file: string) => boolean;
  spawn: (runtime: string, args: string[]) => { status: number | null };
  out: (text: string) => void;
  err: (text: string) => void;
  exit: (code: number) => void;
}

export function usage(): string {
  const rows = Object.entries(COMMANDS)
    .map(([name, cmd]) => `  discord ${name.padEnd(12)} ${cmd.help}`)
    .join('\n');
  return `Usage: discord <command>\n\n${rows}\n`;
}

export function main(argv: string[], deps: CliDeps = processDeps()): void {
  const [, , cmd, ...rest] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h') {
    deps.out(usage());
    deps.exit(cmd ? 0 : 1);
    return;
  }
  const found = COMMANDS[cmd];
  if (!found) {
    deps.err(`[discord.ts] unknown command "${cmd}".\n\n${usage()}`);
    deps.exit(1);
    return;
  }
  if (rest.includes('--help') || rest.includes('-h')) {
    deps.out(usage());
    deps.exit(0);
    return;
  }
  const file = path.resolve(deps.cwd, found.file);
  if (!deps.exists(file)) {
    deps.err(
      `[discord.ts] missing ${found.file}. Run inside your bot app${found.runtime === 'node' ? ' after building' : ''}.`,
    );
    deps.exit(1);
    return;
  }
  const run = deps.spawn(found.runtime, [file, ...found.args, ...rest]);
  deps.exit(run.status ?? 1);
}

function processDeps(): CliDeps {
  return {
    cwd: process.cwd(),
    exists: (file) => fs.existsSync(file),
    spawn: (runtime, args) => spawnSync(runtime, args, { stdio: 'inherit' }),
    out: (text) => void process.stdout.write(text),
    err: (text) => void process.stderr.write(text),
    exit: (code) => process.exit(code),
  };
}

const entry = process.argv[1];
if (
  entry !== undefined &&
  fs.realpathSync(entry) === fs.realpathSync(fileURLToPath(import.meta.url))
) {
  main(process.argv);
}
