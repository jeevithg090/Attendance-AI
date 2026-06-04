// ═══════════════════════════════════════════════════════════
// AttendAI — Attendance Service (Core business logic)
// ═══════════════════════════════════════════════════════════

import { db } from '../db/connection';
import { attendanceRecords, attendanceSessions, subjectEnrollments, subjects, users, notifications, systemSettings } from '../db/schema';
import { eq, and, sql, count } from 'drizzle-orm';

// ── Haversine distance (meters) ──────────────────────────
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ── Verify geofence ──────────────────────────────────────
export async function verifyGeofence(
  studentLat: number,
  studentLng: number
): Promise<{ withinBounds: boolean; distance: number; radius: number }> {
  const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, 'global')).limit(1);

  if (!settings || !settings.geofencingEnabled) {
    return { withinBounds: true, distance: 0, radius: 0 };
  }

  const distance = haversineDistance(
    studentLat, studentLng,
    settings.campusLat, settings.campusLng
  );

  return {
    withinBounds: distance <= settings.campusRadius,
    distance: Math.round(distance),
    radius: settings.campusRadius,
  };
}

// ── Check duplicate attendance ───────────────────────────
export async function checkDuplicate(sessionId: string, studentId: string): Promise<boolean> {
  const [existing] = await db.select({ id: attendanceRecords.id })
    .from(attendanceRecords)
    .where(and(
      eq(attendanceRecords.sessionId, sessionId),
      eq(attendanceRecords.studentId, studentId)
    ))
    .limit(1);

  return !!existing;
}

// ── Check if student is enrolled in subject ──────────────
export async function isStudentEnrolled(subjectId: string, studentId: string): Promise<boolean> {
  const [enrollment] = await db.select({ id: subjectEnrollments.id })
    .from(subjectEnrollments)
    .where(and(
      eq(subjectEnrollments.subjectId, subjectId),
      eq(subjectEnrollments.studentId, studentId)
    ))
    .limit(1);

  return !!enrollment;
}

// ── Get attendance percentage for a student in a subject ─
export async function getAttendancePercentage(
  subjectId: string,
  studentId: string
): Promise<number> {
  const [subject] = await db.select({ totalClasses: subjects.totalClasses })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);

  if (!subject || subject.totalClasses === 0) return 100;

  const [result] = await db.select({ count: count() })
    .from(attendanceRecords)
    .where(and(
      eq(attendanceRecords.subjectId, subjectId),
      eq(attendanceRecords.studentId, studentId),
      eq(attendanceRecords.status, 'present')
    ));

  const presentCount = result?.count || 0;
  return Math.round((presentCount / subject.totalClasses) * 100);
}

// ── Close session and mark absent students ───────────────
export async function closeSession(sessionId: string) {
  const [session] = await db.select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.id, sessionId))
    .limit(1);

  if (!session) throw new Error('Session not found');

  // Get all enrolled students for this subject
  const enrolledStudents = await db.select({
    studentId: subjectEnrollments.studentId,
    displayName: users.displayName,
    enrollmentId: users.enrollmentId,
  })
    .from(subjectEnrollments)
    .innerJoin(users, eq(users.id, subjectEnrollments.studentId))
    .where(eq(subjectEnrollments.subjectId, session.subjectId));

  // Get students who already marked attendance
  const markedStudents = await db.select({ studentId: attendanceRecords.studentId })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.sessionId, sessionId));

  const markedSet = new Set(markedStudents.map(r => r.studentId));

  // Mark absent for students who didn't mark
  for (const student of enrolledStudents) {
    if (!markedSet.has(student.studentId)) {
      await db.insert(attendanceRecords).values({
        sessionId,
        subjectId: session.subjectId,
        studentId: student.studentId,
        studentName: student.displayName,
        enrollmentId: student.enrollmentId || '',
        date: session.date,
        status: 'absent',
        verificationMethod: 'manual_override',
        faceMatchScore: 0,
        faceMatchThreshold: 0,
        flagged: false,
      });

      // Create absent notification
      await db.insert(notifications).values({
        recipientId: student.studentId,
        type: 'absent_alert',
        title: 'Absent from Class',
        message: `You were marked absent for ${session.subjectName} (${session.subjectCode}) on ${session.date}`,
        metadata: { sessionId, subjectId: session.subjectId },
      });

      // Check low attendance
      const percentage = await getAttendancePercentage(session.subjectId, student.studentId);
      const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, 'global')).limit(1);

      if (settings && percentage < settings.minimumAttendancePercent) {
        await db.insert(notifications).values({
          recipientId: student.studentId,
          type: 'low_attendance',
          title: 'Low Attendance Warning',
          message: `Your attendance in ${session.subjectName} is ${percentage}%, below the minimum ${settings.minimumAttendancePercent}%`,
          metadata: { subjectId: session.subjectId, percentage },
        });
      }
    }
  }

  // Update session status
  const presentCount = markedStudents.filter(s => markedSet.has(s.studentId)).length;
  await db.update(attendanceSessions)
    .set({
      status: 'closed',
      endTime: new Date(),
      totalPresent: presentCount,
    })
    .where(eq(attendanceSessions.id, sessionId));

  // Increment totalClasses for the subject
  await db.update(subjects)
    .set({
      totalClasses: sql`${subjects.totalClasses} + 1`,
    })
    .where(eq(subjects.id, session.subjectId));
}
