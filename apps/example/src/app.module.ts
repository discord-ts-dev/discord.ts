import { Module } from '@discord.ts/common';
import { DiscordModule } from '@discord.ts/core';
import { PingCommand } from './commands/ping.command.js';
import { QuestCommand } from './commands/quest.command.js';
import { RollCommand } from './commands/roll.command.js';
import { ModerationCommand } from './commands/moderation.command.js';
import { ReadyListener } from './events/ready.listener.js';

@Module({
  imports: [DiscordModule.forRootAsync()],
  providers: [PingCommand, QuestCommand, RollCommand, ModerationCommand, ReadyListener],
})
export class AppModule {}
