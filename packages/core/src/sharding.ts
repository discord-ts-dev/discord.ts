import { ShardingManager } from 'discord.js';
import { DiscordLogger } from './logger';

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
