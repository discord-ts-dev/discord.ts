import type { Type } from '@discord-ts-dev/common';
import { createRuntime } from './discord.module.js';

// ponytail: sync without login. Used by deploy script + CI.
// The factory parameter is the test seam (bun's mock.module is process-global).
export async function deployWithModule(
  appModule: Type<unknown>,
  create: typeof createRuntime = createRuntime,
): Promise<{ count: number }> {
  const { discovery, sync, shutdown } = await create(appModule, { skipValidation: false });
  try {
    const body = discovery.buildJson();
    await sync.sync(body);
    return { count: body.length };
  } finally {
    // `createRuntime` ran `onModuleInit`, so it has to run the other half too —
    // otherwise a provider that connected here is never released.
    await shutdown().catch((err: Error) => {
      process.stderr.write(`[deploy] ${err.message}\n`);
    });
    await discovery.stop();
  }
}
