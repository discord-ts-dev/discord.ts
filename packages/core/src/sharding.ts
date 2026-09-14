import { ShardingManager } from 'discord.js';
import { DiscordLogger, type Type } from '@discord.ts/common';
import { loadShardingOptions } from './config.js';
import { createRuntime } from './discord.module.js';

export interface ShardingOptions {
  /** Entry file each shard boots, e.g. `./src/main.ts`. Relative to cwd. */
  file: string;
  token: string;
  totalShards?: number | 'auto';
  respawn?: boolean;
}

// ponytail: thin wrapper, discord.js negotiates shard ids over IPC
export function createShardManager(opts: ShardingOptions): ShardingManager {
  const logger = new DiscordLogger('Sharding');
  const manager = new ShardingManager(opts.file, {
    token: opts.token,
    totalShards: opts.totalShards ?? 'auto',
    respawn: opts.respawn ?? true,
  });
  manager.on('shardCreate', (shard) => logger.success(`shard ${shard.id} spawned`));
  return manager;
}

export async function runShards(opts: ShardingOptions): Promise<ShardingManager> {
  const manager = createShardManager(opts);
  await manager.spawn();
  return manager;
}

// ponytail: gate on argv, not env. Children inherit env, flag keeps them bots.
export async function bootstrapApp(
  appModule: Type<unknown>,
  opts: { argv?: string[] } = {},
): Promise<void> {
  if ((opts.argv ?? process.argv).includes('--shards')) {
    await runShards(await loadShardingOptions());
    new DiscordLogger('Sharding').success('Shards spawned.');
    return;
  }
  const { discovery } = await createRuntime(appModule);
  const shutdown = () => void discovery.stop();
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  await discovery.start();
}
