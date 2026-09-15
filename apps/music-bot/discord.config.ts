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
    GatewayIntentBits.MessageContent,
  ],
  development: [],
  skipRegistration: true,
  prefix: '!',
  shardFile: './src/main.ts',
  respawn: true,
  i18n: {
    defaultLocale: 'EnglishUS',
    localesDir: './src/locales',
    languages: ['EnglishUS', 'Indonesian', 'Japanese', 'Korean', 'Vietnamese'],
  },
});
