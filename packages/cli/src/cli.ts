#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

interface CliCommand {
  file: string;
  runtime: 'bun' | 'node';
  args: string[];
  help: string;
}

// ponytail: no arg-parser dep, five commands fit in one table.
const COMMANDS: Record<string, CliCommand> = {
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

function usage(): string {
  const rows = Object.entries(COMMANDS)
    .map(([name, cmd]) => `  discord ${name.padEnd(12)} ${cmd.help}`)
    .join('\n');
  return `Usage: discord <command>\n\n${rows}\n`;
}

function main(): void {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === '--help' || cmd === '-h') {
    process.stdout.write(usage());
    process.exit(cmd ? 0 : 1);
  }
  const found = COMMANDS[cmd];
  if (!found) {
    console.error(`[discord.ts] unknown command "${cmd}".\n\n${usage()}`);
    process.exit(1);
  }
  if (rest.includes('--help') || rest.includes('-h')) {
    process.stdout.write(usage());
    process.exit(0);
  }
  const file = path.resolve(process.cwd(), found.file);
  if (!fs.existsSync(file)) {
    console.error(
      `[discord.ts] missing ${found.file}. Run inside your bot app${found.runtime === 'node' ? ' after building' : ''}.`,
    );
    process.exit(1);
  }
  const run = spawnSync(found.runtime, [file, ...found.args, ...rest], { stdio: 'inherit' });
  process.exit(run.status ?? 1);
}

main();
