import { GatewayIntentBits } from 'discord.js';
import { defineConfig } from 'discord.ts';

// ponytail: non-secrets here, secrets via DISCORD_TOKEN / DISCORD_CLIENT_ID env.
export default defineConfig({
  token: 'test-token',
  clientId: 'test-client',
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  development: [],
  skipRegistration: true,
  prefix: '!',
  // ponytail: sharding is opt-in. `bun src/main.ts --shards` reads these.
  shardFile: './src/main.ts',
  respawn: true,
  // shardCount: 2, // or SHARD_COUNT=2
});
