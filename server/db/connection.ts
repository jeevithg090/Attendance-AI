// ═══════════════════════════════════════════════════════════
// AttendAI — Neon DB Connection (Drizzle ORM)
// ═══════════════════════════════════════════════════════════

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("CRITICAL ERROR: DATABASE_URL is entirely missing from process.env!");
  console.error("Currently loaded environment variable keys:", Object.keys(process.env).join(", "));
  throw new Error("DATABASE_URL environment variable is missing. Please check your deployment settings.");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
export { schema };
