import { NestFactory } from '@nestjs/core';
import { DiscordDiscoveryService } from './discovery/discord-discovery.service';
import { DiscordSyncService } from './discovery/discord-sync.service';

// ponytail: sync without login. Used by deploy script + CI.
export async function deployWithModule(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appModule: any,
): Promise<{ count: number }> {
  const ctx = await NestFactory.createApplicationContext(appModule, { logger: ['error'] });
  try {
    const discovery = ctx.get(DiscordDiscoveryService, { strict: false });
    const sync = ctx.get(DiscordSyncService, { strict: false });
    const body = discovery.buildJson();
    await sync.sync(body);
    return { count: body.length };
  } finally {
    await ctx.close();
  }
}
