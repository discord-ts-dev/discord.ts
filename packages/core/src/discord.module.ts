import { Client } from 'discord.js';
import { MODULE_METADATA, type DiscordModuleOptions, type Type } from '@discord.ts/common';
import { loadDiscordConfig } from './config.js';
import { DiscordDiscoveryService } from './discovery/discord-discovery.service.js';
import { DiscordRoutingService } from './discovery/discord-routing.service.js';
import { DiscordSyncService } from './discovery/discord-sync.service.js';
import { BotPermissionsGuard } from './guards/bot-permissions.guard.js';
import { CooldownGuard } from './guards/cooldown.guard.js';
import { GuildGuard } from './guards/guild.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { initI18n } from '@discord.ts/i18n';

export interface DiscordModuleAsyncOpts {
  cwd?: string;
  configPath?: string;
  skipValidation?: boolean;
  overrides?: Partial<DiscordModuleOptions>;
}

interface SyncDef {
  module: typeof DiscordModule;
  kind: 'sync';
  options: DiscordModuleOptions;
}

interface AsyncDef {
  module: typeof DiscordModule;
  kind: 'async';
  opts: DiscordModuleAsyncOpts;
}

export class DiscordModule {
  static forRoot(options: DiscordModuleOptions): SyncDef {
    return { module: DiscordModule, kind: 'sync', options };
  }

  // ponytail: file + env + overrides. Inline overrides win over all.
  static forRootAsync(opts: DiscordModuleAsyncOpts = {}): AsyncDef {
    return { module: DiscordModule, kind: 'async', opts };
  }
}

function moduleMeta(target: object): { imports?: unknown[]; providers?: Type[] } {
  return (Reflect.getMetadata(MODULE_METADATA, target) ?? {}) as {
    imports?: unknown[];
    providers?: Type[];
  };
}

function findDiscordDef(imports: unknown[] = []): SyncDef | AsyncDef | undefined {
  return imports.find(
    (i) => !!i && typeof i === 'object' && (i as { module?: unknown }).module === DiscordModule,
  ) as SyncDef | AsyncDef | undefined;
}

export async function resolveDiscordOptions(
  appModule: Type<unknown>,
  opts: { skipValidation?: boolean } = {},
): Promise<{ options: DiscordModuleOptions; providers: Type[] }> {
  const meta = moduleMeta(appModule);
  const def = findDiscordDef(meta.imports);
  const providers = meta.providers ?? [];
  if (def?.kind === 'sync') return { options: def.options, providers };
  const asyncOpts = def?.kind === 'async' ? def.opts : {};
  const file = await loadDiscordConfig({ ...asyncOpts, skipValidation: opts.skipValidation });
  const clean = Object.fromEntries(
    Object.entries(asyncOpts.overrides ?? {}).filter(([, v]) => v !== undefined),
  );
  return { options: { ...file, ...clean } as DiscordModuleOptions, providers };
}

export interface DiscordRuntime {
  options: DiscordModuleOptions;
  client: Client;
  sync: DiscordSyncService;
  discovery: DiscordDiscoveryService;
  routing: DiscordRoutingService;
  instances: object[];
}

function buildClient(opts: DiscordModuleOptions): Client {
  // ponytail: omit unset keys, discord.js rejects explicit undefined
  return new Client({
    intents: opts.intents,
    ...(opts.shards !== undefined ? { shards: opts.shards } : {}),
    ...(opts.shardCount !== undefined ? { shardCount: opts.shardCount } : {}),
  });
}

export async function createRuntime(
  appModule: Type<unknown>,
  opts: { skipValidation?: boolean } = {},
): Promise<DiscordRuntime> {
  const { options, providers } = await resolveDiscordOptions(appModule, opts);
  if (options.i18n) initI18n(options.i18n);
  const client = buildClient(options);
  const sync = new DiscordSyncService(options);
  const discovery = new DiscordDiscoveryService(client, options, sync);
  const cooldown = new CooldownGuard();
  const permissions = new PermissionsGuard();
  const botPermissions = new BotPermissionsGuard();
  const guild = new GuildGuard();
  const guards = new Map<unknown, { canActivate(ctx: unknown): unknown }>([
    [CooldownGuard, cooldown as unknown as { canActivate(ctx: unknown): unknown }],
    [PermissionsGuard, permissions as unknown as { canActivate(ctx: unknown): unknown }],
    [BotPermissionsGuard, botPermissions as unknown as { canActivate(ctx: unknown): unknown }],
    [GuildGuard, guild as unknown as { canActivate(ctx: unknown): unknown }],
  ]);
  const instances: object[] = [...providers.map((P) => new (P as Type<object>)() as object)];
  discovery.init(instances);
  const routing = new DiscordRoutingService(client, options, discovery, guards);
  routing.subscribe();
  return { options, client, sync, discovery, routing, instances };
}
