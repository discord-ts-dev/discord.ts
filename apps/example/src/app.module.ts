import { Module, type Provider } from '@discord.ts/common';
import { DiscordModule } from '@discord.ts/core';
import { redisProviders } from '@discord.ts/redis';
import { MemoryStore, STORE } from '@discord.ts/systems';
import { PingCommand } from './commands/ping.command.js';
import { QuestCommand } from './commands/quest.command.js';
import { RollCommand } from './commands/roll.command.js';
import { LeaderboardCommand } from './commands/leaderboard.command.js';
import { ModerationCommand } from './commands/moderation.command.js';
import { ReadyListener } from './events/ready.listener.js';

// Set REDIS_URL to back the systems store with Redis; without it the example
// keeps everything in memory, so it runs anywhere.
const storeProviders: Provider[] = process.env.REDIS_URL
  ? redisProviders(process.env.REDIS_URL)
  : [{ provide: STORE, useValue: new MemoryStore() }];

@Module({
  imports: [DiscordModule.forRootAsync()],
  providers: [
    ...storeProviders,
    PingCommand,
    QuestCommand,
    RollCommand,
    LeaderboardCommand,
    ModerationCommand,
    ReadyListener,
  ],
})
export class AppModule {}
