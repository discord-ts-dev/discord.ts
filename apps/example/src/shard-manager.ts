import { runShards } from 'discord.ts';

async function main(): Promise<void> {
  await runShards({
    file: './src/main.ts',
    token: process.env.DISCORD_TOKEN ?? '',
    totalShards: process.env.SHARD_COUNT ? Number(process.env.SHARD_COUNT) : 'auto',
  });
  console.log('Shards spawned.');
}

void main();
