import { Module } from '@nestjs/common';
import { DiscordModule } from '@discord-ts/core';
import { PingCommand } from './commands/ping.command';
import { RollCommand } from './commands/roll.command';
import { EchoPrefixCommand } from './commands/echo-prefix.command';
import { ReadyListener } from './events/ready.listener';

@Module({
  imports: [DiscordModule.forRootAsync()],
  providers: [PingCommand, RollCommand, EchoPrefixCommand, ReadyListener],
})
export class AppModule {}
