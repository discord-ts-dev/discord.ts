import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// ponytail: lazy Prisma delegate. Null without DATABASE_URL or when the
// generated client cannot connect. Services stay memory-first and call
// `db()` best-effort; reads never block on the database.
let client: PrismaClient | null | undefined;

export async function db(): Promise<PrismaClient | null> {
  if (client !== undefined) return client;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    client = null;
    return null;
  }
  // Prisma 7 has no built-in connector: the pg driver adapter owns the pool.
  const next = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await next.$queryRaw`SELECT 1`;
    client = next;
  } catch {
    // Release the pool the failed probe opened before giving up on the database.
    await next.$disconnect().catch(() => undefined);
    client = null;
  }
  return client;
}
