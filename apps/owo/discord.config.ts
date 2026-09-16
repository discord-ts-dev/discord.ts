import { defineConfig } from '@discord.ts/core';
import { GatewayIntentBits } from 'discord.js';

export default defineConfig({
  // ponytail: MessageContent is privileged (dev portal). Uncomment both
  // intents to enable the guild word filter (/censor). The listener no-ops
  // without MessageContent, so the bot boots either way.
  intents: [
    GatewayIntentBits.Guilds /* GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent */,
  ],
  development: [],
  // ponytail: deploy separately, like apps/example. `bun run deploy`.
  skipRegistration: true,
  i18n: { defaultLocale: 'en', languages: ['en'] },
  // ponytail: sharding opt-in. `bun src/main.ts --shards` reads these.
  shardFile: './src/main.ts',
  respawn: true,
});
