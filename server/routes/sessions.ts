// Attendance session routes.
import { Router } from 'express';
import { and, count, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db/connection';
import { attendanceSessions, subjectEnrollments } from '../db/schema';
import { asyncHandler, conflict, forbidden } from '../http/errors';
import { clampInt, createSessionSchema, queryString, uuidParam } from '../http/validation';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { currentUser, requireRole } from '../middleware/rbac';
import {
  assertOwnsResource,
  closeSession,
  getSessionOrThrow,
  getSubjectOrThrow,
  isStudentEnrolled,
} from '../services/attendanceService';
import { getSettings } from '../services/settingsService';
import { broadcastToSession } from './sse';

const router = Router();
router.use(authenticate);

// GET /api/sessions — teachers see their own sessions, admins see all
router.get(
  '/',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const me = currentUser(req);
    const status = queryString(req.query.status);
    const subjectId = queryString(req.query.subjectId);
    const teacherId = me.role === 'admin' ? queryString(req.query.teacherId) : me.id;

    const conditions: SQL[] = [];
    if (status === 'active' || status === 'closed') conditions.push(eq(attendanceSessions.status, status));
    if (teacherId) conditions.push(eq(attendanceSessions.teacherId, teacherId));
    if (subjectId) conditions.push(eq(attendanceSessions.subjectId, subjectId));

    const rows = await db
      .select()
      .from(attendanceSessions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(attendanceSessions.createdAt))
      .limit(clampInt(req.query.limit, 20, 1, 200));
    res.json({ success: true, data: rows });
  }),
);

// GET /api/sessions/active — active sessions for the student's enrolled subjects
router.get(
  '/active',
  requireRole('student'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const enrolledSubjects = db
      .select({ subjectId: subjectEnrollments.subjectId })
      .from(subjectEnrollments)
      .where(eq(subjectEnrollments.studentId, currentUser(req).id));

    const rows = await db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.status, 'active'), inArray(attendanceSessions.subjectId, enrolledSubjects)))
      .orderBy(desc(attendanceSessions.startTime));
    res.json({ success: true, data: rows.map(({ sessionToken: _token, ...rest }) => rest) });
  }),
);

// POST /api/sessions — start a session
router.post(
  '/',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const me = currentUser(req);
    const { subjectId } = createSessionSchema.parse(req.body);
    const subject = await getSubjectOrThrow(subjectId);
    assertOwnsResource(me, subject.teacherId);

    const [existingActive] = await db
      .select({ id: attendanceSessions.id })
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.subjectId, subjectId), eq(attendanceSessions.status, 'active')))
      .limit(1);
    if (existingActive) throw conflict('An active session already exists for this subject');

    const [{ enrolled }] = await db
      .select({ enrolled: count() })
      .from(subjectEnrollments)
      .where(eq(subjectEnrollments.subjectId, subjectId));
    const settings = await getSettings();

    const now = new Date();
    const [session] = await db
      .insert(attendanceSessions)
      .values({
        subjectId,
        subjectName: subject.name,
        subjectCode: subject.code,
        teacherId: me.id,
        teacherName: me.displayName,
        date: now.toISOString().slice(0, 10),
        startTime: now,
        status: 'active',
        tokenExpiresAt: new Date(now.getTime() + settings.sessionTokenRefreshSeconds * 1000),
        locationLat: settings.geofencingEnabled ? settings.campusLat : null,
        locationLng: settings.geofencingEnabled ? settings.campusLng : null,
        locationRadius: settings.geofencingEnabled ? settings.campusRadius : null,
        totalEnrolled: enrolled,
      })
      .returning();
    res.status(201).json({ success: true, data: session });
  }),
);

// POST /api/sessions/:id/close
router.post(
  '/:id/close',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const session = await getSessionOrThrow(uuidParam(req.params.id));
    assertOwnsResource(currentUser(req), session.teacherId);
    const closed = await closeSession(session.id);
    broadcastToSession(session.id, { type: 'session_closed', data: closed });
    res.json({ success: true, message: 'Session closed successfully', data: closed });
  }),
);

// GET /api/sessions/:id
router.get(
  '/:id',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const me = currentUser(req);
    const session = await getSessionOrThrow(uuidParam(req.params.id));
    if (me.role === 'student' && !(await isStudentEnrolled(session.subjectId, me.id))) throw forbidden();
    if (me.role === 'teacher') assertOwnsResource(me, session.teacherId);

    // Never expose the rotating session token to students.
    const { sessionToken, ...rest } = session;
    res.json({ success: true, data: me.role === 'student' ? rest : { ...rest, sessionToken } });
  }),
);

export default router;
