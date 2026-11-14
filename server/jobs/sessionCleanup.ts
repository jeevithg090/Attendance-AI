// Closes sessions whose attendance window has elapsed (runs every 5 minutes).
import { and, eq, lt } from 'drizzle-orm';
import { db } from '../db/connection';
import { attendanceSessions } from '../db/schema';
import { closeSession } from '../services/attendanceService';
import { getSettings } from '../services/settingsService';
import { broadcastToSession } from '../routes/sse';

export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const settings = await getSettings();
    const cutoff = new Date(Date.now() - settings.attendanceWindowMinutes * 60_000);

    const expired = await db
      .select({ id: attendanceSessions.id })
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.status, 'active'), lt(attendanceSessions.startTime, cutoff)));

    let closed = 0;
    for (const { id } of expired) {
      try {
        const session = await closeSession(id);
        broadcastToSession(id, { type: 'session_closed', data: session });
        closed++;
      } catch (error) {
        console.error(`[SessionCleanup] Error closing session ${id}:`, error);
      }
    }
    if (closed > 0) console.log(`[SessionCleanup] Closed ${closed} expired session(s)`);
    return closed;
  } catch (error) {
    console.error('[SessionCleanup] Error:', error);
    return 0;
  }
}
