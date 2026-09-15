import type { Type } from '@discord.ts/common';
import { createRuntime } from './discord.module.js';

// ponytail: sync without login. Used by deploy script + CI.
// The factory parameter is the test seam (bun's mock.module is process-global).
export async function deployWithModule(
  appModule: Type<unknown>,
  create: typeof createRuntime = createRuntime,
): Promise<{ count: number }> {
  const { discovery, sync } = await create(appModule, { skipValidation: false });
  try {
    const body = discovery.buildJson();
    await sync.sync(body);
    return { count: body.length };
  } finally {
    await discovery.stop();
  }
}
