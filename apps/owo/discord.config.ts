import { defineConfig } from '@discord.ts/core';
import { GatewayIntentBits } from 'discord.js';

export default defineConfig({
  // ponytail: GuildMembers (join verification) and MessageContent (word
  // filter) both need portal toggles; asking for them without the toggle
  // fails login, so they stay commented. Enable in the portal, then here.
  intents: [GatewayIntentBits.Guilds],
  development: [],
  // ponytail: deploy separately, like apps/example. `bun run deploy`.
  skipRegistration: true,
  i18n: { defaultLocale: 'en', languages: ['en'] },
  // ponytail: sharding opt-in. `bun src/main.ts --shards` reads these.
  shardFile: './src/main.ts',
  respawn: true,
});
