import { Module } from '@nestjs/common';
import { GatewayIntentBits } from 'discord.js';
import { DiscordModule } from '@discord.ts/core';
import { PingCommand } from './commands/ping.command';
import { RollCommand } from './commands/roll.command';
import { EchoPrefixCommand } from './commands/echo-prefix.command';
import { ReadyListener } from './events/ready.listener';

@Module({
  imports: [
    DiscordModule.forRoot({
      token: process.env.DISCORD_TOKEN ?? 'test-token',
      clientId: process.env.DISCORD_CLIENT_ID ?? 'test-client',
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
      development: process.env.DISCORD_GUILD_ID ? [process.env.DISCORD_GUILD_ID] : [],
      skipRegistration: process.env.SKIP_REGISTRATION !== 'false',
      prefix: '!',
    }),
  ],
  providers: [PingCommand, RollCommand, EchoPrefixCommand, ReadyListener],
})
export class AppModule {}
