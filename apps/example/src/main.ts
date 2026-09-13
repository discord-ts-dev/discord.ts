import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DiscordLogger, loadShardingOptions, runShards } from 'discord.ts';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // ponytail: gate on argv, not env. Children inherit env, flag keeps them bots.
  if (process.argv.includes('--shards')) {
    await runShards(await loadShardingOptions());
    new DiscordLogger('Sharding').success('Shards spawned.');
    return;
  }
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  await app.init();
}

void bootstrap();
