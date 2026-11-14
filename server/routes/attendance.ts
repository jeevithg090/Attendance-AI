// Attendance marking, overrides and reporting.
import { Router } from 'express';
import { and, count, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/connection';
import {
  attendanceRecords,
  attendanceSessions,
  notifications,
  subjectEnrollments,
  subjects,
  users,
} from '../db/schema';
import {
  ATTENDED_STATUSES,
  attendancePercentage,
  countsAsAttended,
  evaluateAttendance,
} from '../lib/attendance';
import { bestFaceMatch } from '../lib/face';
import { asyncHandler, badRequest, conflict, forbidden, isUniqueViolation, notFound } from '../http/errors';
import { markAttendanceSchema, overrideSchema, queryString, uuidParam } from '../http/validation';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { currentUser, requireRole } from '../middleware/rbac';
import {
  assertOwnsResource,
  getSessionOrThrow,
  getSubjectOrThrow,
  hasMarkedAttendance,
  isStudentEnrolled,
} from '../services/attendanceService';
import { getSettings } from '../services/settingsService';
import { broadcastToSession } from './sse';

const router = Router();
router.use(authenticate);

const attendedStatuses = [...ATTENDED_STATUSES] as ('present' | 'late')[];
const isoDate = (value: unknown) => {
  const s = queryString(value);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
};

/** Present+late counts per student for a subject, in one grouped query. */
async function attendedCountsBySubject(subjectId: string) {
  const rows = await db
    .select({ studentId: attendanceRecords.studentId, count: count() })
    .from(attendanceRecords)
    .where(
      and(eq(attendanceRecords.subjectId, subjectId), inArray(attendanceRecords.status, attendedStatuses)),
    )
    .groupBy(attendanceRecords.studentId);
  return new Map(rows.map((r) => [r.studentId, r.count]));
}

// POST /api/attendance/mark — student checks in with a live face descriptor
router.post(
  '/mark',
  requireRole('student'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const me = currentUser(req);
    const input = markAttendanceSchema.parse(req.body);

    const session = await getSessionOrThrow(input.sessionId);
    if (session.status !== 'active') throw badRequest('Session has ended');

    const settings = await getSettings();
    const now = new Date();
    const windowEnds = new Date(session.startTime).getTime() + settings.attendanceWindowMinutes * 60_000;
    if (now.getTime() > windowEnds) throw badRequest('The attendance window for this session has closed');

    if (!(await isStudentEnrolled(session.subjectId, me.id))) {
      throw forbidden('You are not enrolled in this subject');
    }
    if (await hasMarkedAttendance(session.id, me.id)) {
      throw conflict('Attendance already marked for this session');
    }

    const [student] = await db
      .select({
        displayName: users.displayName,
        enrollmentId: users.enrollmentId,
        faceDescriptors: users.faceDescriptors,
      })
      .from(users)
      .where(eq(users.id, me.id))
      .limit(1);

    // Face matching happens on the server so clients cannot submit their own score.
    const match = bestFaceMatch(input.faceDescriptor, student?.faceDescriptors);
    if (!match) throw badRequest('Face data not enrolled. Please enrol your face from your profile first.');

    const hasLocation = typeof input.latitude === 'number' && typeof input.longitude === 'number';
    const evaluation = evaluateAttendance({
      faceScore: match.score,
      faceThreshold: settings.faceMatchThreshold,
      sessionStart: new Date(session.startTime),
      now,
      lateThresholdMinutes: settings.lateThresholdMinutes,
      location: hasLocation ? { lat: input.latitude as number, lng: input.longitude as number } : null,
      geofence: {
        enabled: settings.geofencingEnabled,
        lat: settings.campusLat,
        lng: settings.campusLng,
        radius: settings.campusRadius,
      },
    });

    let record;
    try {
      [record] = await db
        .insert(attendanceRecords)
        .values({
          sessionId: session.id,
          subjectId: session.subjectId,
          studentId: me.id,
          studentName: student?.displayName ?? me.displayName,
          enrollmentId: student?.enrollmentId ?? '',
          date: session.date,
          status: evaluation.status,
          verificationMethod: 'face_recognition',
          faceMatchScore: match.score,
          faceMatchThreshold: settings.faceMatchThreshold,
          ipAddress: req.ip,
          deviceInfo: input.deviceInfo,
          locationLat: hasLocation ? input.latitude : null,
          locationLng: hasLocation ? input.longitude : null,
          flagged: evaluation.flagged,
          flagReason: evaluation.flagReasons.join('; ') || null,
        })
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict('Attendance already marked for this session');
      throw error;
    }

    if (evaluation.status === 'proxy_detected') {
      await db.insert(notifications).values({
        recipientId: session.teacherId,
        type: 'proxy_detected',
        title: 'Proxy Attempt Detected',
        message: `Possible proxy attempt by ${record.studentName} in ${session.subjectName}. Face match: ${(match.score * 100).toFixed(1)}%`,
        metadata: { sessionId: session.id, studentId: me.id },
      });
    }

    if (countsAsAttended(evaluation.status)) {
      await db
        .update(attendanceSessions)
        .set({ totalPresent: sql`${attendanceSessions.totalPresent} + 1` })
        .where(eq(attendanceSessions.id, session.id));
    }

    broadcastToSession(session.id, { type: 'new_record', data: record });
    res.status(201).json({ success: true, data: record });
  }),
);

// POST /api/attendance/override — teacher/admin corrects a record
router.post(
  '/override',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const me = currentUser(req);
    const { recordId, status, reason } = overrideSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, recordId))
      .limit(1);
    if (!existing) throw notFound('Attendance record not found');
    const session = await getSessionOrThrow(existing.sessionId);
    assertOwnsResource(me, session.teacherId);

    const [updated] = await db
      .update(attendanceRecords)
      .set({
        status,
        verificationMethod: 'manual_override',
        overrideBy: me.id,
        overrideReason: reason,
        flagged: false,
      })
      .where(eq(attendanceRecords.id, recordId))
      .returning();

    const delta = Number(countsAsAttended(status)) - Number(countsAsAttended(existing.status));
    if (delta !== 0) {
      await db
        .update(attendanceSessions)
        .set({ totalPresent: sql`greatest(${attendanceSessions.totalPresent} + ${delta}, 0)` })
        .where(eq(attendanceSessions.id, session.id));
    }

    broadcastToSession(session.id, { type: 'record_updated', data: updated });
    res.json({ success: true, data: updated });
  }),
);

// GET /api/attendance/session/:sessionId
router.get(
  '/session/:sessionId',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const session = await getSessionOrThrow(uuidParam(req.params.sessionId));
    assertOwnsResource(currentUser(req), session.teacherId);

    const records = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, session.id))
      .orderBy(desc(attendanceRecords.markedAt));
    res.json({ success: true, data: records });
  }),
);

// GET /api/attendance/student/:studentId — students may only read their own history
router.get(
  '/student/:studentId',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const me = currentUser(req);
    const studentId = uuidParam(req.params.studentId);
    if (me.role === 'student' && me.id !== studentId) throw forbidden();

    const conditions: SQL[] = [eq(attendanceRecords.studentId, studentId)];
    const subjectId = queryString(req.query.subjectId);
    const startDate = isoDate(req.query.startDate);
    const endDate = isoDate(req.query.endDate);
    if (subjectId) conditions.push(eq(attendanceRecords.subjectId, uuidParam(subjectId)));
    if (startDate) conditions.push(gte(attendanceRecords.date, startDate));
    if (endDate) conditions.push(lte(attendanceRecords.date, endDate));

    const records = await db
      .select()
      .from(attendanceRecords)
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.date), desc(attendanceRecords.markedAt));
    res.json({ success: true, data: records });
  }),
);

// GET /api/attendance/subject/:subjectId/stats
router.get(
  '/subject/:subjectId/stats',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const subject = await getSubjectOrThrow(uuidParam(req.params.subjectId));
    assertOwnsResource(currentUser(req), subject.teacherId);

    const enrolledStudents = await db
      .select({ studentId: users.id, displayName: users.displayName, enrollmentId: users.enrollmentId })
      .from(subjectEnrollments)
      .innerJoin(users, eq(users.id, subjectEnrollments.studentId))
      .where(eq(subjectEnrollments.subjectId, subject.id));

    const attended = await attendedCountsBySubject(subject.id);
    const stats = enrolledStudents.map((s) => {
      const totalPresent = attended.get(s.studentId) ?? 0;
      return {
        ...s,
        totalPresent,
        totalClasses: subject.totalClasses,
        percentage: attendancePercentage(totalPresent, subject.totalClasses),
      };
    });
    res.json({ success: true, data: stats });
  }),
);

// GET /api/attendance/dashboard/stats (admin)
router.get(
  '/dashboard/stats',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);

    const [[students], [teachers], [subjectTotal], [activeSessions], [todayRow]] = await Promise.all([
      db.select({ n: count() }).from(users).where(eq(users.role, 'student')),
      db.select({ n: count() }).from(users).where(eq(users.role, 'teacher')),
      db.select({ n: count() }).from(subjects),
      db.select({ n: count() }).from(attendanceSessions).where(eq(attendanceSessions.status, 'active')),
      db
        .select({
          total: count(),
          attended:
            sql<number>`count(*) filter (where ${inArray(attendanceRecords.status, attendedStatuses)})`.mapWith(
              Number,
            ),
          flagged: sql<number>`count(*) filter (where ${attendanceRecords.flagged})`.mapWith(Number),
        })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.date, today)),
    ]);

    res.json({
      success: true,
      data: {
        totalStudents: students?.n ?? 0,
        totalTeachers: teachers?.n ?? 0,
        totalSubjects: subjectTotal?.n ?? 0,
        activeSessions: activeSessions?.n ?? 0,
        todayAttendancePercent:
          todayRow && todayRow.total > 0 ? Math.round((todayRow.attended / todayRow.total) * 100) : 0,
        proxyAttemptsToday: todayRow?.flagged ?? 0,
        departmentWise: [],
        attendanceTrend: [],
      },
    });
  }),
);

// GET /api/attendance/my-stats (student)
router.get(
  '/my-stats',
  requireRole('student'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const me = currentUser(req);
    const enrollments = await db
      .select({ subject: subjects })
      .from(subjectEnrollments)
      .innerJoin(subjects, eq(subjects.id, subjectEnrollments.subjectId))
      .where(eq(subjectEnrollments.studentId, me.id));

    const attendedRows = await db
      .select({ subjectId: attendanceRecords.subjectId, count: count() })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.studentId, me.id), inArray(attendanceRecords.status, attendedStatuses)))
      .groupBy(attendanceRecords.subjectId);
    const attended = new Map(attendedRows.map((r) => [r.subjectId, r.count]));

    const subjectAttendance = enrollments.map(({ subject }) => {
      const count = attended.get(subject.id) ?? 0;
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        totalClasses: subject.totalClasses,
        attended: count,
        percentage: attendancePercentage(count, subject.totalClasses),
      };
    });

    const recentActivity = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.studentId, me.id))
      .orderBy(desc(attendanceRecords.markedAt))
      .limit(10);

    res.json({ success: true, data: { subjectAttendance, recentActivity } });
  }),
);

export default router;
