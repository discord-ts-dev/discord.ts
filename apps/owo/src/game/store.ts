import * as path from 'node:path';
import { FileStore, type Store } from '@discord.ts/systems';

export { FileStore };

export const store: Store = new FileStore(
  process.env.OWO_DATA_FILE ?? path.resolve('data/owo.json'),
);
