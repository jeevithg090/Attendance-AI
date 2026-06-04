// ═══════════════════════════════════════════════════════════
// AttendAI — Subject Routes
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { db } from '../db/connection';
import { subjects, subjectEnrollments, users } from '../db/schema';
import { eq, and, count, desc } from 'drizzle-orm';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
router.use(authenticate);

// ── GET /api/subjects ────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { teacherId, department } = req.query;
    const conditions = [];

    if (teacherId) conditions.push(eq(subjects.teacherId, teacherId as string));
    if (department) conditions.push(eq(subjects.department, department as string));

    let query = db.select().from(subjects).$dynamic();
    if (conditions.length > 0) query = query.where(and(...conditions));

    const result = await query.orderBy(desc(subjects.createdAt));

    // Add enrolled count for each subject
    const enriched = await Promise.all(result.map(async (subject) => {
      const [enrolledResult] = await db.select({ count: count() })
        .from(subjectEnrollments)
        .where(eq(subjectEnrollments.subjectId, subject.id));

      return { ...subject, enrolledCount: enrolledResult?.count || 0 };
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/subjects/my-subjects (for current teacher) ──
router.get('/my-subjects', requireRole('teacher'), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await db.select().from(subjects)
      .where(eq(subjects.teacherId, req.user!.id))
      .orderBy(desc(subjects.createdAt));

    const enriched = await Promise.all(result.map(async (subject) => {
      const [enrolledResult] = await db.select({ count: count() })
        .from(subjectEnrollments)
        .where(eq(subjectEnrollments.subjectId, subject.id));

      return { ...subject, enrolledCount: enrolledResult?.count || 0 };
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/subjects/enrolled (for current student) ─────
router.get('/enrolled', requireRole('student'), async (req: AuthenticatedRequest, res) => {
  try {
    const enrollments = await db.select({
      subject: subjects,
    })
      .from(subjectEnrollments)
      .innerJoin(subjects, eq(subjects.id, subjectEnrollments.subjectId))
      .where(eq(subjectEnrollments.studentId, req.user!.id));

    res.json({ success: true, data: enrollments.map(e => e.subject) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/subjects/:id ────────────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, req.params.id)).limit(1);
    if (!subject) {
      res.status(404).json({ success: false, error: 'Subject not found' });
      return;
    }

    const [enrolledResult] = await db.select({ count: count() })
      .from(subjectEnrollments)
      .where(eq(subjectEnrollments.subjectId, subject.id));

    res.json({ success: true, data: { ...subject, enrolledCount: enrolledResult?.count || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/subjects ───────────────────────────────────
router.post('/', requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, code, department, semester, teacherId, schedule } = req.body;
    const actualTeacherId = teacherId || req.user!.id;

    // Get teacher name
    const [teacher] = await db.select({ displayName: users.displayName })
      .from(users).where(eq(users.id, actualTeacherId)).limit(1);

    const [subject] = await db.insert(subjects).values({
      name,
      code,
      department,
      semester,
      teacherId: actualTeacherId,
      teacherName: teacher?.displayName || '',
      schedule: schedule || [],
    }).returning();

    res.status(201).json({ success: true, data: subject });
  } catch (error: any) {
    if (error.message?.includes('duplicate')) {
      res.status(409).json({ success: false, error: 'Subject code already exists' });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PUT /api/subjects/:id ────────────────────────────────
router.put('/:id', requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, schedule, isActive } = req.body;

    const [updated] = await db.update(subjects)
      .set({
        ...(name && { name }),
        ...(schedule && { schedule }),
        ...(isActive !== undefined && { isActive }),
      })
      .where(eq(subjects.id, req.params.id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/subjects/:id/enroll ────────────────────────
router.post('/:id/enroll', requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      res.status(400).json({ success: false, error: 'studentIds array required' });
      return;
    }

    let enrolled = 0;
    for (const studentId of studentIds) {
      try {
        await db.insert(subjectEnrollments).values({
          subjectId: req.params.id,
          studentId,
        });
        enrolled++;
      } catch { /* skip duplicates */ }
    }

    res.json({ success: true, data: { enrolled } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/subjects/:id/students ───────────────────────
router.get('/:id/students', async (req: AuthenticatedRequest, res) => {
  try {
    const enrolledStudents = await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      enrollmentId: users.enrollmentId,
      department: users.department,
      faceEnrolled: users.faceEnrolled,
    })
      .from(subjectEnrollments)
      .innerJoin(users, eq(users.id, subjectEnrollments.studentId))
      .where(eq(subjectEnrollments.subjectId, req.params.id));

    res.json({ success: true, data: enrolledStudents });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
