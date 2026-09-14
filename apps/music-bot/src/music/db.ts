import { PrismaClient } from '@prisma/client';

// ponytail: lazy Prisma delegate. Null without DATABASE_URL or when the
// generated client cannot connect. Services stay memory-first and call
// `db()` best-effort; reads never block on the database.
let client: PrismaClient | null | undefined;

export async function db(): Promise<PrismaClient | null> {
  if (client !== undefined) return client;
  if (!process.env.DATABASE_URL) {
    client = null;
    return null;
  }
  try {
    const next = new PrismaClient();
    await next.$queryRaw`SELECT 1`;
    client = next;
  } catch {
    client = null;
  }
  return client;
}
