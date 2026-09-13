import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Client } from 'discord.js';
import { DISCORD_CLIENT, DISCORD_MODULE_OPTIONS } from './constants';
import type { DiscordModuleOptions } from './types';
import { DiscordDiscoveryService } from './discovery/discord-discovery.service';
import { DiscordSyncService } from './discovery/discord-sync.service';
import { CooldownGuard } from './guards/cooldown.guard';
import { PermissionsGuard } from './guards/permissions.guard';

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
          useFactory: (opts: DiscordModuleOptions) =>
            new Client({
              intents: opts.intents,
              shards: opts.shards,
              shardCount: opts.shardCount,
            }),
          inject: [DISCORD_MODULE_OPTIONS],
        },
        DiscordSyncService,
        DiscordDiscoveryService,
        CooldownGuard,
        PermissionsGuard,
      ],
      exports: [DISCORD_MODULE_OPTIONS, DISCORD_CLIENT],
      global: true,
    };
  }
}
