import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Client } from 'discord.js';
import { DISCORD_CLIENT, DISCORD_MODULE_OPTIONS } from './constants';
import type { DiscordModuleOptions } from './types';
import { DiscordDiscoveryService } from './discovery/discord-discovery.service';
import { DiscordSyncService } from './discovery/discord-sync.service';

@Module({})
export class DiscordModule {
  static forRoot(options: DiscordModuleOptions): DynamicModule {
    return {
      module: DiscordModule,
      imports: [DiscoveryModule],
      providers: [
        { provide: DISCORD_MODULE_OPTIONS, useValue: options },
        {
          provide: DISCORD_CLIENT,
          useFactory: (opts: DiscordModuleOptions) => new Client({ intents: opts.intents }),
          inject: [DISCORD_MODULE_OPTIONS],
        },
        DiscordSyncService,
        DiscordDiscoveryService,
      ],
      exports: [DISCORD_MODULE_OPTIONS, DISCORD_CLIENT],
      global: true,
    };
  }
}
