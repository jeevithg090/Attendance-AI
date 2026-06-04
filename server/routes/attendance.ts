// ═══════════════════════════════════════════════════════════
// AttendAI — Attendance Routes (Mark & Query)
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { db } from '../db/connection';
import { attendanceRecords, attendanceSessions, systemSettings, users, subjects, subjectEnrollments, notifications } from '../db/schema';
import { eq, and, desc, between, count, sql } from 'drizzle-orm';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { verifyGeofence, checkDuplicate, isStudentEnrolled, getAttendancePercentage } from '../services/attendanceService';

const router = Router();
router.use(authenticate);

// ── POST /api/attendance/mark ────────────────────────────
router.post('/mark', requireRole('student'), async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId, faceMatchScore, latitude, longitude, deviceInfo } = req.body;

    // Get session
    const [session] = await db.select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.id, sessionId))
      .limit(1);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    if (session.status !== 'active') {
      res.status(400).json({ success: false, error: 'Session has ended' });
      return;
    }

    // Check if student is enrolled
    const enrolled = await isStudentEnrolled(session.subjectId, req.user!.id);
    if (!enrolled) {
      res.status(403).json({ success: false, error: 'You are not enrolled in this subject' });
      return;
    }

    // Check duplicate
    const duplicate = await checkDuplicate(sessionId, req.user!.id);
    if (duplicate) {
      res.status(409).json({ success: false, error: 'Attendance already marked for this session' });
      return;
    }

    // Get settings
    const [settings] = await db.select().from(systemSettings)
      .where(eq(systemSettings.id, 'global')).limit(1);

    const threshold = settings?.faceMatchThreshold || 0.5;

    // Geofence check
    let geofenceOk = true;
    let flagged = false;
    let flagReason = '';

    if (settings?.geofencingEnabled && latitude && longitude) {
      const geoResult = await verifyGeofence(latitude, longitude);
      if (!geoResult.withinBounds) {
        geofenceOk = false;
        flagged = true;
        flagReason = `Outside campus geofence. Distance: ${geoResult.distance}m (max: ${geoResult.radius}m)`;
      }
    } else if (settings?.geofencingEnabled && (!latitude || !longitude)) {
      flagged = true;
      flagReason = 'GPS location not provided';
    }

    // Determine status
    let status: 'present' | 'late' | 'proxy_detected' = 'present';

    // Check if face match score is below threshold
    if (faceMatchScore < threshold) {
      status = 'proxy_detected';
      flagged = true;
      flagReason = `Face match score ${faceMatchScore} below threshold ${threshold}`;

      // Send proxy notification
      await db.insert(notifications).values({
        recipientId: session.teacherId,
        type: 'proxy_detected',
        title: 'Proxy Attempt Detected',
        message: `Possible proxy attempt by student in ${session.subjectName}. Face match: ${(faceMatchScore * 100).toFixed(1)}%`,
        metadata: { sessionId, studentId: req.user!.id },
      });
    }

    // Check if late
    if (status === 'present' && settings?.lateThresholdMinutes) {
      const sessionStart = new Date(session.startTime).getTime();
      const now = Date.now();
      const minutesPassed = (now - sessionStart) / (1000 * 60);
      if (minutesPassed > settings.lateThresholdMinutes) {
        status = 'late';
      }
    }

    // If geofence failed, flag as proxy
    if (!geofenceOk) {
      status = 'proxy_detected';
    }

    // Get student details
    const [student] = await db.select({
      displayName: users.displayName,
      enrollmentId: users.enrollmentId,
    }).from(users).where(eq(users.id, req.user!.id)).limit(1);

    // Create attendance record
    const [record] = await db.insert(attendanceRecords).values({
      sessionId,
      subjectId: session.subjectId,
      studentId: req.user!.id,
      studentName: student?.displayName || req.user!.displayName,
      enrollmentId: student?.enrollmentId || '',
      date: session.date,
      status,
      verificationMethod: 'face_recognition',
      faceMatchScore,
      faceMatchThreshold: threshold,
      ipAddress: (req.ip || req.headers['x-forwarded-for'] as string) || undefined,
      deviceInfo,
      locationLat: latitude,
      locationLng: longitude,
      flagged,
      flagReason: flagReason || undefined,
    }).returning();

    // Update session present count
    if (status === 'present' || status === 'late') {
      await db.update(attendanceSessions)
        .set({ totalPresent: sql`${attendanceSessions.totalPresent} + 1` })
        .where(eq(attendanceSessions.id, sessionId));
    }

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/attendance/override ────────────────────────
router.post('/override', requireRole('teacher', 'admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { recordId, status, reason } = req.body;

    const [updated] = await db.update(attendanceRecords)
      .set({
        status,
        verificationMethod: 'manual_override',
        overrideBy: req.user!.id,
        overrideReason: reason,
        flagged: false,
      })
      .where(eq(attendanceRecords.id, recordId))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/attendance/session/:sessionId ────────────────
router.get('/session/:sessionId', async (req: AuthenticatedRequest, res) => {
  try {
    const records = await db.select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, req.params.sessionId))
      .orderBy(desc(attendanceRecords.markedAt));

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/attendance/student/:studentId ────────────────
router.get('/student/:studentId', async (req: AuthenticatedRequest, res) => {
  try {
    const { subjectId, startDate, endDate } = req.query;
    const conditions = [eq(attendanceRecords.studentId, req.params.studentId)];

    if (subjectId) conditions.push(eq(attendanceRecords.subjectId, subjectId as string));

    const records = await db.select()
      .from(attendanceRecords)
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.date));

    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/attendance/subject/:subjectId/stats ─────────
router.get('/subject/:subjectId/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const subjectId = req.params.subjectId;

    // Get enrolled students with their attendance
    const enrolledStudents = await db.select({
      studentId: users.id,
      displayName: users.displayName,
      enrollmentId: users.enrollmentId,
    })
      .from(subjectEnrollments)
      .innerJoin(users, eq(users.id, subjectEnrollments.studentId))
      .where(eq(subjectEnrollments.subjectId, subjectId));

    const [subject] = await db.select({ totalClasses: subjects.totalClasses })
      .from(subjects).where(eq(subjects.id, subjectId)).limit(1);

    const stats = await Promise.all(enrolledStudents.map(async (student) => {
      const [presentResult] = await db.select({ count: count() })
        .from(attendanceRecords)
        .where(and(
          eq(attendanceRecords.subjectId, subjectId),
          eq(attendanceRecords.studentId, student.studentId),
          eq(attendanceRecords.status, 'present')
        ));

      const totalPresent = presentResult?.count || 0;
      const totalClasses = subject?.totalClasses || 0;
      const percentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 100;

      return {
        studentId: student.studentId,
        displayName: student.displayName,
        enrollmentId: student.enrollmentId,
        totalPresent,
        totalClasses,
        percentage,
      };
    }));

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/attendance/dashboard/stats ───────────────────
router.get('/dashboard/stats', requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Total counts
    const [studentCount] = await db.select({ count: count() }).from(users).where(eq(users.role, 'student'));
    const [teacherCount] = await db.select({ count: count() }).from(users).where(eq(users.role, 'teacher'));
    const [subjectCount] = await db.select({ count: count() }).from(subjects);
    const [activeSessionCount] = await db.select({ count: count() })
      .from(attendanceSessions).where(eq(attendanceSessions.status, 'active'));

    // Today's attendance
    const [todayPresent] = await db.select({ count: count() })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.date, today), eq(attendanceRecords.status, 'present')));

    const [todayTotal] = await db.select({ count: count() })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.date, today));

    const todayPercent = (todayTotal?.count || 0) > 0
      ? Math.round(((todayPresent?.count || 0) / (todayTotal?.count || 0)) * 100)
      : 0;

    // Proxy attempts today
    const [proxyCount] = await db.select({ count: count() })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.date, today), eq(attendanceRecords.flagged, true)));

    res.json({
      success: true,
      data: {
        totalStudents: studentCount?.count || 0,
        totalTeachers: teacherCount?.count || 0,
        totalSubjects: subjectCount?.count || 0,
        activeSessions: activeSessionCount?.count || 0,
        todayAttendancePercent: todayPercent,
        proxyAttemptsToday: proxyCount?.count || 0,
        departmentWise: [],
        attendanceTrend: [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/attendance/my-stats (student) ────────────────
router.get('/my-stats', requireRole('student'), async (req: AuthenticatedRequest, res) => {
  try {
    // Get enrolled subjects
    const enrollments = await db.select({ subject: subjects })
      .from(subjectEnrollments)
      .innerJoin(subjects, eq(subjects.id, subjectEnrollments.subjectId))
      .where(eq(subjectEnrollments.studentId, req.user!.id));

    const subjectAttendance = await Promise.all(enrollments.map(async (e) => {
      const percentage = await getAttendancePercentage(e.subject.id, req.user!.id);

      const [presentCount] = await db.select({ count: count() })
        .from(attendanceRecords)
        .where(and(
          eq(attendanceRecords.subjectId, e.subject.id),
          eq(attendanceRecords.studentId, req.user!.id),
          eq(attendanceRecords.status, 'present')
        ));

      return {
        subjectId: e.subject.id,
        subjectName: e.subject.name,
        subjectCode: e.subject.code,
        totalClasses: e.subject.totalClasses,
        attended: presentCount?.count || 0,
        percentage,
      };
    }));

    // Recent activity
    const recentActivity = await db.select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.studentId, req.user!.id))
      .orderBy(desc(attendanceRecords.markedAt))
      .limit(10);

    res.json({
      success: true,
      data: { subjectAttendance, recentActivity },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
