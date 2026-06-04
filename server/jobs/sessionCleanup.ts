// ═══════════════════════════════════════════════════════════
// AttendAI — Session Cleanup Job (every 5 minutes)
// ═══════════════════════════════════════════════════════════

import { db } from '../db/connection';
import { attendanceSessions, systemSettings } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { closeSession } from '../services/attendanceService';

export async function cleanupExpiredSessions() {
  try {
    const [settings] = await db.select().from(systemSettings)
      .where(eq(systemSettings.id, 'global')).limit(1);

    const windowMinutes = settings?.attendanceWindowMinutes || 30;

    // Find active sessions that have expired
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

    const expiredSessions = await db.select({ id: attendanceSessions.id })
      .from(attendanceSessions)
      .where(and(
        eq(attendanceSessions.status, 'active'),
        lt(attendanceSessions.startTime, cutoff)
      ));

    for (const session of expiredSessions) {
      try {
        await closeSession(session.id);
        console.log(`[SessionCleanup] Closed expired session ${session.id}`);
      } catch (error) {
        console.error(`[SessionCleanup] Error closing session ${session.id}:`, error);
      }
    }

    if (expiredSessions.length > 0) {
      console.log(`[SessionCleanup] Closed ${expiredSessions.length} expired sessions`);
    }
  } catch (error) {
    console.error('[SessionCleanup] Error:', error);
  }
}
