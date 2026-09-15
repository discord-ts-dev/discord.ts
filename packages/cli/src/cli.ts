#!/usr/bin/env bun
// ponytail: path.resolve and realpathSync have no Bun equivalent; both are
// Bun-native implementations of the node modules.
import { realpathSync } from 'node:fs';
import * as path from 'node:path';

export interface CliCommand {
  file: string;
  args: string[];
  help: string;
  /** Built output, so a missing file means "build first". */
  needsBuild?: boolean;
}

// ponytail: no arg-parser dep, five commands fit in one table. Bun runs both
// TS source and build output, so no runtime switch.
export const COMMANDS: Record<string, CliCommand> = {
  dev: { file: 'src/main.ts', args: [], help: 'boot bot from TS source' },
  'dev:shard': { file: 'src/main.ts', args: ['--shards'], help: 'boot shards from TS source' },
  deploy: { file: 'src/deploy.ts', args: [], help: 'sync commands without login' },
  start: { file: 'dist/main.js', args: [], help: 'boot bot from build output', needsBuild: true },
  'start:shard': {
    file: 'dist/main.js',
    args: ['--shards'],
    help: 'boot shards from build output',
    needsBuild: true,
  },
};

/** Side effects `main` needs, injectable so tests never spawn or exit. */
export interface CliDeps {
  cwd: string;
  exists: (file: string) => Promise<boolean>;
  spawn: (argv: string[]) => { exitCode: number | null };
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

export async function main(argv: string[], deps: CliDeps = processDeps()): Promise<void> {
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
  if (!(await deps.exists(file))) {
    deps.err(
      `[discord.ts] missing ${found.file}. Run inside your bot app${found.needsBuild ? ' after building' : ''}.`,
    );
    deps.exit(1);
    return;
  }
  const run = deps.spawn([process.execPath, file, ...found.args, ...rest]);
  deps.exit(run.exitCode ?? 1);
}

/** True when this module is the process entry. Realpath so bin symlinks match. */
export function isEntry(entry: string | undefined, moduleUrl: string): boolean {
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(Bun.fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}

export async function mainIfEntry(
  argv: string[],
  moduleUrl: string,
  deps: CliDeps = processDeps(),
): Promise<void> {
  if (isEntry(argv[1], moduleUrl)) await main(argv, deps);
}

export function processDeps(): CliDeps {
  return {
    cwd: process.cwd(),
    exists: (file) => Bun.file(file).exists(),
    spawn: (argv) => Bun.spawnSync(argv, { stdio: ['inherit', 'inherit', 'inherit'] }),
    out: (text) => void Bun.stdout.write(text),
    err: (text) => void Bun.stderr.write(text),
    exit: (code) => {
      process.exitCode = code;
    },
  };
}

await mainIfEntry(Bun.argv, import.meta.url);
