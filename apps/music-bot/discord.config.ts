import { GatewayIntentBits } from 'discord.js';
import { defineConfig } from '@discord.ts/core';

// ponytail: non-secrets here, secrets via DISCORD_TOKEN / DISCORD_CLIENT_ID env.
export default defineConfig({
  token: 'test-token',
  clientId: 'test-client',
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  development: [],
  skipRegistration: true,
  shardFile: './src/main.ts',
  respawn: true,
  // ponytail: owner ids unlock @RequireOwner commands. Prefer DISCORD_OWNER_IDS env.
  owners: [],
  i18n: {
    defaultLocale: 'en-US',
    localesDir: './src/locales',
    languages: ['en-US', 'id', 'ja', 'ko', 'vi'],
  },
});
