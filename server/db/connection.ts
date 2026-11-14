// Database client (Drizzle ORM).
//
// Neon URLs (*.neon.tech) use Neon's serverless HTTP driver, which needs no
// connection pool. Any other PostgreSQL URL (local Postgres, Docker, RDS, ...)
// uses node-postgres, so the API can run against a plain local database.
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.neon.tech');
  } catch {
    return false;
  }
}

function createDatabase(url: string): Database {
  if (isNeonUrl(url)) {
    return drizzleNeon(neon(url), { schema }) as unknown as Database;
  }
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  return drizzlePg(pool, { schema }) as unknown as Database;
}

export const db = createDatabase(env.DATABASE_URL);
export { schema };
