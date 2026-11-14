// Attendance business logic that needs the database.
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/connection';
import {
  attendanceRecords,
  attendanceSessions,
  notifications,
  subjectEnrollments,
  subjects,
  users,
} from '../db/schema';
import { ATTENDED_STATUSES, attendancePercentage } from '../lib/attendance';
import { forbidden, notFound } from '../http/errors';
import type { AuthUser } from '../middleware/auth';
import { getSettings } from './settingsService';

export type Session = typeof attendanceSessions.$inferSelect;
export type Subject = typeof subjects.$inferSelect;

const attendedStatuses = [...ATTENDED_STATUSES] as ('present' | 'late')[];

export async function isStudentEnrolled(subjectId: string, studentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: subjectEnrollments.id })
    .from(subjectEnrollments)
    .where(and(eq(subjectEnrollments.subjectId, subjectId), eq(subjectEnrollments.studentId, studentId)))
    .limit(1);
  return Boolean(row);
}

export async function hasMarkedAttendance(sessionId: string, studentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: attendanceRecords.id })
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.sessionId, sessionId), eq(attendanceRecords.studentId, studentId)))
    .limit(1);
  return Boolean(row);
}

/** Number of sessions a student attended (present or late) in a subject. */
export async function getAttendedCount(subjectId: string, studentId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.subjectId, subjectId),
        eq(attendanceRecords.studentId, studentId),
        inArray(attendanceRecords.status, attendedStatuses),
      ),
    );
  return row?.count ?? 0;
}

export async function getAttendancePercentage(subjectId: string, studentId: string): Promise<number> {
  const [subject] = await db
    .select({ totalClasses: subjects.totalClasses })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);
  if (!subject) return 100;
  return attendancePercentage(await getAttendedCount(subjectId, studentId), subject.totalClasses);
}

export async function getSessionOrThrow(sessionId: string): Promise<Session> {
  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);
  if (!session) throw notFound('Session not found');
  return session;
}

export async function getSubjectOrThrow(subjectId: string): Promise<Subject> {
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
  if (!subject) throw notFound('Subject not found');
  return subject;
}

/** Teachers may only manage their own subjects/sessions; admins may manage all. */
export function assertOwnsResource(user: AuthUser, ownerId: string | null) {
  if (user.role === 'admin') return;
  if (user.role === 'teacher' && ownerId === user.id) return;
  throw forbidden('You do not have permission to manage this resource');
}

/**
 * Close an attendance session: mark every enrolled student who did not check in
 * as absent, notify them, and update the session/subject counters.
 * Closing an already-closed session is a no-op.
 */
export async function closeSession(sessionId: string): Promise<Session> {
  const session = await getSessionOrThrow(sessionId);
  if (session.status === 'closed') return session;

  // Flip the status first so concurrent closers (cron + teacher) don't double count.
  const [claimed] = await db
    .update(attendanceSessions)
    .set({ status: 'closed', endTime: new Date() })
    .where(and(eq(attendanceSessions.id, sessionId), eq(attendanceSessions.status, 'active')))
    .returning({ id: attendanceSessions.id });
  if (!claimed) return getSessionOrThrow(sessionId);

  const [subject] = await db
    .update(subjects)
    .set({ totalClasses: sql`${subjects.totalClasses} + 1` })
    .where(eq(subjects.id, session.subjectId))
    .returning({ totalClasses: subjects.totalClasses });

  const enrolledStudents = await db
    .select({
      studentId: subjectEnrollments.studentId,
      displayName: users.displayName,
      enrollmentId: users.enrollmentId,
    })
    .from(subjectEnrollments)
    .innerJoin(users, eq(users.id, subjectEnrollments.studentId))
    .where(eq(subjectEnrollments.subjectId, session.subjectId));

  const existingRecords = await db
    .select({ studentId: attendanceRecords.studentId, status: attendanceRecords.status })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.sessionId, sessionId));

  const marked = new Set(existingRecords.map((r) => r.studentId));
  const absentees = enrolledStudents.filter((s) => !marked.has(s.studentId));

  if (absentees.length > 0) {
    await db
      .insert(attendanceRecords)
      .values(
        absentees.map((s) => ({
          sessionId,
          subjectId: session.subjectId,
          studentId: s.studentId,
          studentName: s.displayName,
          enrollmentId: s.enrollmentId ?? '',
          date: session.date,
          status: 'absent' as const,
          verificationMethod: 'manual_override' as const,
          flagged: false,
        })),
      )
      .onConflictDoNothing();

    const settings = await getSettings();
    const totalClasses = subject?.totalClasses ?? 0;
    const alerts: (typeof notifications.$inferInsert)[] = [];

    for (const s of absentees) {
      alerts.push({
        recipientId: s.studentId,
        type: 'absent_alert',
        title: 'Absent from Class',
        message: `You were marked absent for ${session.subjectName} (${session.subjectCode}) on ${session.date}`,
        metadata: { sessionId, subjectId: session.subjectId },
      });

      const percentage = attendancePercentage(
        await getAttendedCount(session.subjectId, s.studentId),
        totalClasses,
      );
      if (percentage < settings.minimumAttendancePercent) {
        alerts.push({
          recipientId: s.studentId,
          type: 'low_attendance',
          title: 'Low Attendance Warning',
          message: `Your attendance in ${session.subjectName} is ${percentage}%, below the minimum ${settings.minimumAttendancePercent}%`,
          metadata: { subjectId: session.subjectId, percentage },
        });
      }
    }
    await db.insert(notifications).values(alerts);
  }

  const presentCount = existingRecords.filter((r) => attendedStatuses.includes(r.status as 'present')).length;
  const [updated] = await db
    .update(attendanceSessions)
    .set({ totalPresent: presentCount })
    .where(eq(attendanceSessions.id, sessionId))
    .returning();
  return updated;
}
