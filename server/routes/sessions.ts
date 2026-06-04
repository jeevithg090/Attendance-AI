// ═══════════════════════════════════════════════════════════
// AttendAI — Session Routes
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { db } from '../db/connection';
import { attendanceSessions, subjects, subjectEnrollments, systemSettings } from '../db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { closeSession } from '../services/attendanceService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authenticate);

// ── GET /api/sessions ────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { status, teacherId, subjectId, limit: queryLimit = '20' } = req.query;
    const conditions = [];

    if (status) conditions.push(eq(attendanceSessions.status, status as 'active' | 'closed'));
    if (teacherId) conditions.push(eq(attendanceSessions.teacherId, teacherId as string));
    if (subjectId) conditions.push(eq(attendanceSessions.subjectId, subjectId as string));

    let query = db.select().from(attendanceSessions).$dynamic();
    if (conditions.length > 0) query = query.where(and(...conditions));

    const result = await query
      .orderBy(desc(attendanceSessions.createdAt))
      .limit(parseInt(queryLimit as string));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/sessions/active (for student — active sessions for enrolled subjects)
router.get('/active', requireRole('student'), async (req: AuthenticatedRequest, res) => {
  try {
    // Get student's enrolled subjects
    const enrollments = await db.select({ subjectId: subjectEnrollments.subjectId })
      .from(subjectEnrollments)
      .where(eq(subjectEnrollments.studentId, req.user!.id));

    const subjectIds = enrollments.map(e => e.subjectId);

    if (subjectIds.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    // Get active sessions for those subjects
    const activeSessions = [];
    for (const subjectId of subjectIds) {
      const sessions = await db.select()
        .from(attendanceSessions)
        .where(and(
          eq(attendanceSessions.subjectId, subjectId),
          eq(attendanceSessions.status, 'active')
        ));
      activeSessions.push(...sessions);
    }

    res.json({ success: true, data: activeSessions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/sessions ───────────────────────────────────
router.post('/', requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { subjectId } = req.body;

    // Get subject details
    const [subject] = await db.select().from(subjects)
      .where(eq(subjects.id, subjectId)).limit(1);

    if (!subject) {
      res.status(404).json({ success: false, error: 'Subject not found' });
      return;
    }

    // Check for existing active session
    const [existingActive] = await db.select({ id: attendanceSessions.id })
      .from(attendanceSessions)
      .where(and(
        eq(attendanceSessions.subjectId, subjectId),
        eq(attendanceSessions.status, 'active')
      ))
      .limit(1);

    if (existingActive) {
      res.status(409).json({ success: false, error: 'An active session already exists for this subject' });
      return;
    }

    // Get enrolled count
    const [enrolledResult] = await db.select({ count: count() })
      .from(subjectEnrollments)
      .where(eq(subjectEnrollments.subjectId, subjectId));

    // Get system settings for geofencing
    const [settings] = await db.select().from(systemSettings)
      .where(eq(systemSettings.id, 'global')).limit(1);

    const now = new Date();
    const tokenExpiry = new Date(now.getTime() + (settings?.sessionTokenRefreshSeconds || 60) * 1000);

    const [session] = await db.insert(attendanceSessions).values({
      subjectId,
      subjectName: subject.name,
      subjectCode: subject.code,
      teacherId: req.user!.id,
      teacherName: req.user!.displayName,
      date: now.toISOString().split('T')[0],
      startTime: now,
      status: 'active',
      tokenExpiresAt: tokenExpiry,
      locationLat: settings?.geofencingEnabled ? settings.campusLat : null,
      locationLng: settings?.geofencingEnabled ? settings.campusLng : null,
      locationRadius: settings?.geofencingEnabled ? settings.campusRadius : null,
      totalEnrolled: enrolledResult?.count || 0,
    }).returning();

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/sessions/:id/close ─────────────────────────
router.post('/:id/close', requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    await closeSession(req.params.id);
    res.json({ success: true, message: 'Session closed successfully' });
  } catch (error: any) {
    console.error('Close session error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ── GET /api/sessions/:id ────────────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const [session] = await db.select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.id, req.params.id))
      .limit(1);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
