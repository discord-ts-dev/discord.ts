import { defineConfig } from '@discord.ts/core';
import { GatewayIntentBits } from 'discord.js';

export default defineConfig({
  intents: [GatewayIntentBits.Guilds],
  development: [],
  // ponytail: deploy separately, like apps/example. `bun run deploy`.
  skipRegistration: true,
  i18n: { defaultLocale: 'en', languages: ['en'] },
  // ponytail: sharding opt-in. `bun src/main.ts --shards` reads these.
  shardFile: './src/main.ts',
  respawn: true,
});
