import { ShardingManager } from 'discord.js';
import { DiscordLogger, type Type } from '@discord-ts-dev/common';
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
// The runtime factory parameter is the test seam (bun's mock.module is process-global).
export async function bootstrapApp(
  appModule: Type<unknown>,
  opts: { argv?: string[]; create?: typeof createRuntime } = {},
): Promise<void> {
  if ((opts.argv ?? process.argv).includes('--shards')) {
    await runShards(await loadShardingOptions());
    new DiscordLogger('Sharding').success('Shards spawned.');
    return;
  }
  const { discovery, shutdown } = await (opts.create ?? createRuntime)(appModule);
  // Providers first, client second: a shutdown hook may still want to talk to
  // Discord, and a hook that throws must not strand the websocket open.
  const stop = async (): Promise<void> => {
    try {
      await shutdown();
    } catch (err) {
      new DiscordLogger('Lifecycle').error((err as Error).message);
    }
    await discovery.stop();
  };
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
  await discovery.start();
}
