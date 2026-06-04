// ═══════════════════════════════════════════════════════════
// AttendAI — Database Migration Runner
// ═══════════════════════════════════════════════════════════

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  
  console.log('✅ Migrations complete!');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
