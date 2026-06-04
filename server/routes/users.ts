// ═══════════════════════════════════════════════════════════
// AttendAI — User Management Routes (Admin)
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { eq, ilike, and, or, count, desc } from 'drizzle-orm';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { hashPassword } from '../services/authService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── GET /api/users ───────────────────────────────────────
router.get('/', requireRole('admin', 'teacher'), async (req: AuthenticatedRequest, res) => {
  try {
    const { role, department, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      photoUrl: users.photoUrl,
      phone: users.phone,
      department: users.department,
      enrollmentId: users.enrollmentId,
      employeeId: users.employeeId,
      faceEnrolled: users.faceEnrolled,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).$dynamic();

    const conditions = [];
    if (role) conditions.push(eq(users.role, role as string));
    if (department) conditions.push(eq(users.department, department as string));
    if (search) {
      conditions.push(
        or(
          ilike(users.displayName, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.enrollmentId, `%${search}%`)
        )!
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.orderBy(desc(users.createdAt)).limit(limitNum).offset(offset);

    // Count total
    const [totalResult] = await db.select({ count: count() }).from(users);

    res.json({
      success: true,
      data: {
        items: result,
        total: totalResult?.count || 0,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/users/:id ───────────────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      photoUrl: users.photoUrl,
      phone: users.phone,
      department: users.department,
      enrollmentId: users.enrollmentId,
      employeeId: users.employeeId,
      faceEnrolled: users.faceEnrolled,
      faceDescriptors: users.faceDescriptors,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, req.params.id)).limit(1);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PUT /api/users/:id ───────────────────────────────────
router.put('/:id', requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { displayName, phone, department, isActive, role } = req.body;

    const [updated] = await db.update(users)
      .set({
        ...(displayName && { displayName }),
        ...(phone !== undefined && { phone }),
        ...(department && { department }),
        ...(isActive !== undefined && { isActive }),
        ...(role && { role }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { passwordHash: _, ...userWithoutPassword } = updated;
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── DELETE /api/users/:id (soft delete) ──────────────────
router.delete('/:id', requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    await db.update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, req.params.id));

    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/users/:id/face-descriptors ─────────────────
router.post('/:id/face-descriptors', async (req: AuthenticatedRequest, res) => {
  try {
    const { descriptors } = req.body;

    // Only allow updating own face data or admin
    if (req.user!.id !== req.params.id && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0) {
      res.status(400).json({ success: false, error: 'Face descriptors required' });
      return;
    }

    const [updated] = await db.update(users)
      .set({
        faceDescriptors: descriptors,
        faceEnrolled: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.params.id))
      .returning();

    res.json({ success: true, data: { faceEnrolled: true, descriptorCount: descriptors.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/users/bulk-import ──────────────────────────
router.post('/bulk-import', requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      res.status(400).json({ success: false, error: 'Students array required' });
      return;
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const student of students) {
      try {
        const hashedPassword = await hashPassword(student.password || 'Student@123');
        await db.insert(users).values({
          email: student.email,
          passwordHash: hashedPassword,
          displayName: student.displayName,
          role: 'student',
          department: student.department,
          enrollmentId: student.enrollmentId,
          phone: student.phone,
        });
        results.created++;
      } catch (err: any) {
        results.skipped++;
        results.errors.push(`${student.email}: ${err.message}`);
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
