import type { Type } from '@discord.ts/common';
import { createRuntime } from './discord.module.js';

// ponytail: sync without login. Used by deploy script + CI.
export async function deployWithModule(appModule: Type<unknown>): Promise<{ count: number }> {
  const { discovery, sync } = await createRuntime(appModule, { skipValidation: false });
  try {
    const body = discovery.buildJson();
    await sync.sync(body);
    return { count: body.length };
  } finally {
    await discovery.stop();
  }
}
