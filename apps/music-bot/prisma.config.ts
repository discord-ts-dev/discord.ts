import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 stopped loading .env itself. Bun does it for us at runtime, but the
// Prisma CLI also runs under plain node, so load it explicitly. `quiet` keeps
// dotenv's banner out of generate/migrate output.
config({ quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // Plain process.env, not prisma/config's env() helper: env() throws while the
  // config loads, which would break `prisma generate` in CI where no database
  // URL is set. Generate does not need one.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
