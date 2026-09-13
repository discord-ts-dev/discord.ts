import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Client } from 'discord.js';
import {
  DISCORD_CLIENT,
  DISCORD_MODULE_OPTIONS,
  type DiscordModuleOptions,
} from '@discord-ts/common';
import { loadDiscordConfig } from './config';
import { DiscordDiscoveryService } from './discovery/discord-discovery.service';
import { DiscordRoutingService } from './discovery/discord-routing.service';
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
          // ponytail: omit unset keys, discord.js rejects explicit undefined
          useFactory: (opts: DiscordModuleOptions) =>
            new Client({
              intents: opts.intents,
              ...(opts.shards !== undefined ? { shards: opts.shards } : {}),
              ...(opts.shardCount !== undefined ? { shardCount: opts.shardCount } : {}),
            }),
          inject: [DISCORD_MODULE_OPTIONS],
        },
        DiscordSyncService,
        DiscordDiscoveryService,
        DiscordRoutingService,
        CooldownGuard,
        PermissionsGuard,
      ],
      exports: [DISCORD_MODULE_OPTIONS, DISCORD_CLIENT],
      global: true,
    };
  }

  // ponytail: file + env + overrides. Inline overrides win over all.
  static forRootAsync(
    opts: {
      cwd?: string;
      configPath?: string;
      skipValidation?: boolean;
      overrides?: Partial<DiscordModuleOptions>;
    } = {},
  ): DynamicModule {
    return {
      module: DiscordModule,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: DISCORD_MODULE_OPTIONS,
          useFactory: async (): Promise<DiscordModuleOptions> => {
            const file = await loadDiscordConfig(opts);
            const clean = Object.fromEntries(
              Object.entries(opts.overrides ?? {}).filter(([, v]) => v !== undefined),
            );
            return { ...file, ...clean } as DiscordModuleOptions;
          },
        },
        {
          provide: DISCORD_CLIENT,
          // ponytail: omit unset keys, discord.js rejects explicit undefined
          useFactory: (o: DiscordModuleOptions) =>
            new Client({
              intents: o.intents,
              ...(o.shards !== undefined ? { shards: o.shards } : {}),
              ...(o.shardCount !== undefined ? { shardCount: o.shardCount } : {}),
            }),
          inject: [DISCORD_MODULE_OPTIONS],
        },
        DiscordSyncService,
        DiscordDiscoveryService,
        DiscordRoutingService,
        CooldownGuard,
        PermissionsGuard,
      ],
      exports: [DISCORD_MODULE_OPTIONS, DISCORD_CLIENT],
      global: true,
    };
  }
}
