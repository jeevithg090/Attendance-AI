// Rotates the token of every active session (runs every minute).
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { attendanceSessions } from '../db/schema';
import { getSettings } from '../services/settingsService';

export async function refreshSessionTokens(): Promise<void> {
  try {
    const settings = await getSettings();
    await db
      .update(attendanceSessions)
      .set({
        sessionToken: sql`gen_random_uuid()`,
        tokenExpiresAt: new Date(Date.now() + settings.sessionTokenRefreshSeconds * 1000),
      })
      .where(eq(attendanceSessions.status, 'active'));
  } catch (error) {
    console.error('[TokenRefresh] Error:', error);
  }
}
