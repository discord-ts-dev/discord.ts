import { Module } from '@discord.ts/common';
import { DiscordModule } from '@discord.ts/core';
import { PingCommand } from './commands/ping.command.js';
import { RollCommand } from './commands/roll.command.js';
import { EchoPrefixCommand } from './commands/echo-prefix.command.js';
import { ReadyListener } from './events/ready.listener.js';

@Module({
  imports: [DiscordModule.forRootAsync()],
  providers: [PingCommand, RollCommand, EchoPrefixCommand, ReadyListener],
})
export class AppModule {}
