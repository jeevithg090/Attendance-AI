// ═══════════════════════════════════════════════════════════
// AttendAI — Token Refresh Job (every 60 seconds)
// ═══════════════════════════════════════════════════════════

import { db } from '../db/connection';
import { attendanceSessions, systemSettings } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export async function refreshSessionTokens() {
  try {
    const [settings] = await db.select().from(systemSettings)
      .where(eq(systemSettings.id, 'global')).limit(1);

    const refreshSeconds = settings?.sessionTokenRefreshSeconds || 60;
    const tokenExpiry = new Date(Date.now() + refreshSeconds * 1000);

    // Update all active sessions with new tokens
    await db.update(attendanceSessions)
      .set({
        sessionToken: sql`gen_random_uuid()`,
        tokenExpiresAt: tokenExpiry,
      })
      .where(eq(attendanceSessions.status, 'active'));

    console.log(`[TokenRefresh] Refreshed tokens at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[TokenRefresh] Error:', error);
  }
}
