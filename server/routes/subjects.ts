// Subject & enrolment routes.
import { Router } from 'express';
import { and, count, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db/connection';
import { subjectEnrollments, subjects, users } from '../db/schema';
import { asyncHandler, badRequest, conflict, isUniqueViolation } from '../http/errors';
import {
  enrollSchema,
  queryString,
  subjectCreateSchema,
  subjectUpdateSchema,
  uuidParam,
} from '../http/validation';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { currentUser, requireRole } from '../middleware/rbac';
import {
  assertOwnsResource,
  getSubjectOrThrow,
  type Subject,
} from '../services/attendanceService';

const router = Router();
router.use(authenticate);

/** Attach `enrolledCount` to each subject using a single grouped query. */
async function withEnrolledCounts(rows: Subject[]) {
  if (rows.length === 0) return [];
  const counts = await db
    .select({ subjectId: subjectEnrollments.subjectId, count: count() })
    .from(subjectEnrollments)
    .where(
      inArray(
        subjectEnrollments.subjectId,
        rows.map((s) => s.id),
      ),
    )
    .groupBy(subjectEnrollments.subjectId);
  const bySubject = new Map(counts.map((c) => [c.subjectId, c.count]));
  return rows.map((s) => ({ ...s, enrolledCount: bySubject.get(s.id) ?? 0 }));
}

// GET /api/subjects
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const teacherId = queryString(req.query.teacherId);
    const department = queryString(req.query.department);
    const conditions: SQL[] = [];
    if (teacherId) conditions.push(eq(subjects.teacherId, teacherId));
    if (department) conditions.push(eq(subjects.department, department));

    const rows = await db
      .select()
      .from(subjects)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(subjects.createdAt));
    res.json({ success: true, data: await withEnrolledCounts(rows) });
  }),
);

// GET /api/subjects/my-subjects — a teacher's own subjects (admins see all)
router.get(
  '/my-subjects',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const me = currentUser(req);
    const rows = await db
      .select()
      .from(subjects)
      .where(me.role === 'admin' ? undefined : eq(subjects.teacherId, me.id))
      .orderBy(desc(subjects.createdAt));
    res.json({ success: true, data: await withEnrolledCounts(rows) });
  }),
);

// GET /api/subjects/enrolled — the current student's subjects
router.get(
  '/enrolled',
  requireRole('student'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const rows = await db
      .select({ subject: subjects })
      .from(subjectEnrollments)
      .innerJoin(subjects, eq(subjects.id, subjectEnrollments.subjectId))
      .where(eq(subjectEnrollments.studentId, currentUser(req).id));
    res.json({ success: true, data: rows.map((r) => r.subject) });
  }),
);

// GET /api/subjects/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const subject = await getSubjectOrThrow(uuidParam(req.params.id));
    const [withCount] = await withEnrolledCounts([subject]);
    res.json({ success: true, data: withCount });
  }),
);

// POST /api/subjects
router.post(
  '/',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const me = currentUser(req);
    const input = subjectCreateSchema.parse(req.body);

    // Teachers always own the subjects they create; admins may assign a teacher.
    const teacherId = me.role === 'admin' && input.teacherId ? input.teacherId : me.id;
    const [teacher] = await db
      .select({ displayName: users.displayName, role: users.role })
      .from(users)
      .where(eq(users.id, teacherId))
      .limit(1);
    if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
      throw badRequest('teacherId must reference a teacher');
    }

    try {
      const [subject] = await db
        .insert(subjects)
        .values({
          name: input.name,
          code: input.code,
          department: input.department,
          semester: input.semester,
          teacherId,
          teacherName: teacher.displayName,
          schedule: input.schedule ?? [],
        })
        .returning();
      res.status(201).json({ success: true, data: subject });
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict('Subject code already exists');
      throw error;
    }
  }),
);

// PUT /api/subjects/:id
router.put(
  '/:id',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const subject = await getSubjectOrThrow(uuidParam(req.params.id));
    assertOwnsResource(currentUser(req), subject.teacherId);
    const input = subjectUpdateSchema.parse(req.body);

    const [updated] = await db.update(subjects).set(input).where(eq(subjects.id, subject.id)).returning();
    res.json({ success: true, data: updated });
  }),
);

// POST /api/subjects/:id/enroll
router.post(
  '/:id/enroll',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const subject = await getSubjectOrThrow(uuidParam(req.params.id));
    assertOwnsResource(currentUser(req), subject.teacherId);
    const { studentIds } = enrollSchema.parse(req.body);

    const students = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, studentIds), eq(users.role, 'student')));
    if (students.length === 0) throw badRequest('No valid student ids provided');

    const inserted = await db
      .insert(subjectEnrollments)
      .values(students.map((s) => ({ subjectId: subject.id, studentId: s.id })))
      .onConflictDoNothing()
      .returning({ id: subjectEnrollments.id });

    res.json({ success: true, data: { enrolled: inserted.length } });
  }),
);

// GET /api/subjects/:id/students
router.get(
  '/:id/students',
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const subject = await getSubjectOrThrow(uuidParam(req.params.id));
    assertOwnsResource(currentUser(req), subject.teacherId);
    const subjectId = subject.id;

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        enrollmentId: users.enrollmentId,
        department: users.department,
        faceEnrolled: users.faceEnrolled,
      })
      .from(subjectEnrollments)
      .innerJoin(users, eq(users.id, subjectEnrollments.studentId))
      .where(eq(subjectEnrollments.subjectId, subjectId));
    res.json({ success: true, data: rows });
  }),
);

export default router;
