import { pathToFileURL } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { DiscordLogger, type DiscordModuleOptions } from '@discord.ts/common';

// ponytail: file may omit secrets, env fills them. Flat like forRoot opts.
export type DiscordConfigInput = Partial<DiscordModuleOptions>;
export type DiscordConfig = DiscordModuleOptions;

export interface LoadDiscordConfigOptions {
  cwd?: string;
  configPath?: string;
  skipValidation?: boolean;
}

export function defineConfig(config: DiscordConfigInput): DiscordConfigInput {
  return config;
}

// ponytail: soft standard only, warn never throws. See apps/example.
export const STANDARD_PATHS = [
  'discord.config.ts',
  'src/main.ts',
  'src/commands',
  'src/events',
] as const;

export function checkAppStructure(cwd: string = process.cwd()): { ok: boolean; missing: string[] } {
  const missing = STANDARD_PATHS.filter((p) => !fs.existsSync(path.resolve(cwd, p)));
  return { ok: missing.length === 0, missing: [...missing] };
}

function envOverlay(): DiscordConfigInput {
  const out: DiscordConfigInput = {};
  if (process.env.DISCORD_TOKEN) out.token = process.env.DISCORD_TOKEN;
  if (process.env.DISCORD_CLIENT_ID) out.clientId = process.env.DISCORD_CLIENT_ID;
  if (process.env.DISCORD_GUILD_ID) out.development = [process.env.DISCORD_GUILD_ID];
  if (process.env.SKIP_REGISTRATION !== undefined)
    out.skipRegistration = process.env.SKIP_REGISTRATION !== 'false';
  if (process.env.MOD_LOG_CHANNEL_ID) out.modLogChannelId = process.env.MOD_LOG_CHANNEL_ID;
  // ponytail: numeric SHARD_COUNT -> shardCount, 'auto' -> shards auto
  if (process.env.SHARD_COUNT !== undefined) {
    const n = Number(process.env.SHARD_COUNT);
    if (process.env.SHARD_COUNT === 'auto') out.shards = 'auto';
    else if (Number.isFinite(n)) out.shardCount = n;
  }
  return out;
}

function withoutUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

async function importFile(file: string): Promise<DiscordConfigInput> {
  const url = pathToFileURL(file).href;
  const mod = (await import(url)) as { default?: DiscordConfigInput } & DiscordConfigInput;
  return (mod.default ?? mod) as DiscordConfigInput;
}

export async function loadDiscordConfig(
  opts: LoadDiscordConfigOptions = {},
): Promise<DiscordConfig> {
  const cwd = opts.cwd ?? process.cwd();
  const candidates = opts.configPath
    ? [path.resolve(cwd, opts.configPath)]
    : [path.resolve(cwd, 'discord.config.ts')];
  const found = candidates.find((f) => fs.existsSync(f));
  const file: DiscordConfigInput = found ? await importFile(found) : {};
  // ponytail: soft warn, missing folders never block boot
  const structure = checkAppStructure(cwd);
  if (structure.missing.length)
    new DiscordLogger('Config').warn(
      `non-standard App layout, missing: ${structure.missing.join(', ')}. See apps/example.`,
    );
  const merged = {
    prefix: '!',
    development: [],
    skipRegistration: false,
    ...withoutUndefined(file),
    ...withoutUndefined(envOverlay()),
  } as DiscordConfig;
  if (!opts.skipValidation && (!merged.token || !merged.clientId)) {
    throw new Error(
      '[discord.ts] missing token/clientId. Set in discord.config.ts or DISCORD_TOKEN/DISCORD_CLIENT_ID.',
    );
  }
  return merged;
}

// ponytail: shards reuse token + shardCount, same file, no second source.
export async function loadShardingOptions(
  opts: LoadDiscordConfigOptions & { file?: string } = {},
): Promise<{ file: string; token: string; totalShards: number | 'auto'; respawn: boolean }> {
  const cfg = await loadDiscordConfig({ ...opts, skipValidation: true });
  const envCount = process.env.SHARD_COUNT;
  const totalShards =
    envCount === 'auto' || envCount === undefined
      ? (cfg.shardCount ?? 'auto')
      : Number.isFinite(Number(envCount))
        ? Number(envCount)
        : 'auto';
  return {
    file: opts.file ?? cfg.shardFile ?? './src/main.ts',
    token: cfg.token ?? process.env.DISCORD_TOKEN ?? '',
    totalShards: totalShards as number | 'auto',
    respawn: cfg.respawn ?? true,
  };
}
