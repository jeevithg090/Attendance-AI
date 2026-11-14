// Access to the singleton `system_settings` row.
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { systemSettings } from '../db/schema';

export type SystemSettings = typeof systemSettings.$inferSelect;

export const GLOBAL_SETTINGS_ID = 'global';

/** Return the global settings row, creating it with schema defaults if missing. */
export async function getSettings(): Promise<SystemSettings> {
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.id, GLOBAL_SETTINGS_ID))
    .limit(1);
  if (existing) return existing;

  await db.insert(systemSettings).values({ id: GLOBAL_SETTINGS_ID }).onConflictDoNothing();
  const [created] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.id, GLOBAL_SETTINGS_ID))
    .limit(1);
  return created;
}
