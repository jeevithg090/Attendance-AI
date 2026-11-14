// User management routes.
import { Router } from 'express';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { asyncHandler, badRequest, forbidden, isUniqueViolation, notFound } from '../http/errors';
import {
  bulkImportSchema,
  clampInt,
  faceEnrollmentSchema,
  queryString,
  roleSchema,
  userUpdateSchema,
  uuidParam,
} from '../http/validation';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { currentUser, requireRole } from '../middleware/rbac';
import { hashPassword } from '../services/authService';
import { getSettings } from '../services/settingsService';
import { toPublicUser } from '../services/userService';

const router = Router();
router.use(authenticate);

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// GET /api/users
router.get(
  '/',
  requireRole('admin', 'teacher'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const page = clampInt(req.query.page, 1, 1, 10_000);
    const pageSize = clampInt(req.query.limit, 20, 1, 200);
    const role = queryString(req.query.role);
    const department = queryString(req.query.department);
    const search = queryString(req.query.search);

    const conditions: SQL[] = [];
    if (role) conditions.push(eq(users.role, roleSchema.parse(role)));
    if (department) conditions.push(eq(users.department, department));
    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      conditions.push(
        or(ilike(users.displayName, pattern), ilike(users.email, pattern), ilike(users.enrollmentId, pattern))!,
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [{ total }] = await db.select({ total: count() }).from(users).where(where);

    res.json({
      success: true,
      data: {
        items: rows.map(toPublicUser),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }),
);

// POST /api/users/bulk-import
router.post(
  '/bulk-import',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { students } = bulkImportSchema.parse(req.body);
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const student of students) {
      try {
        await db.insert(users).values({
          email: student.email,
          passwordHash: await hashPassword(student.password),
          displayName: student.displayName,
          role: 'student',
          department: student.department,
          enrollmentId: student.enrollmentId,
          phone: student.phone,
        });
        results.created++;
      } catch (error) {
        results.skipped++;
        results.errors.push(
          `${student.email}: ${isUniqueViolation(error) ? 'already exists' : 'could not be created'}`,
        );
      }
    }

    res.json({ success: true, data: results });
  }),
);

// GET /api/users/:id — self, teachers and admins
router.get(
  '/:id',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const id = uuidParam(req.params.id);
    const me = currentUser(req);
    if (me.role === 'student' && me.id !== id) throw forbidden();

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw notFound('User not found');
    res.json({ success: true, data: toPublicUser(user) });
  }),
);

// PUT /api/users/:id
router.put(
  '/:id',
  requireRole('admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const id = uuidParam(req.params.id);
    const input = userUpdateSchema.parse(req.body);
    if (id === currentUser(req).id && (input.isActive === false || (input.role && input.role !== 'admin'))) {
      throw badRequest('You cannot deactivate or demote your own account');
    }

    const [updated] = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw notFound('User not found');
    res.json({ success: true, data: toPublicUser(updated) });
  }),
);

// DELETE /api/users/:id (soft delete)
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const id = uuidParam(req.params.id);
    if (id === currentUser(req).id) throw badRequest('You cannot deactivate your own account');

    const [updated] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!updated) throw notFound('User not found');
    res.json({ success: true, message: 'User deactivated' });
  }),
);

// POST /api/users/:id/face-descriptors — enrol face (self or admin)
router.post(
  '/:id/face-descriptors',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const id = uuidParam(req.params.id);
    const me = currentUser(req);
    if (me.id !== id && me.role !== 'admin') throw forbidden();

    const { descriptors } = faceEnrollmentSchema.parse(req.body);
    const settings = await getSettings();
    if (descriptors.length > settings.maxFaceEnrollmentPhotos) {
      throw badRequest(`At most ${settings.maxFaceEnrollmentPhotos} face samples are allowed`);
    }

    const [updated] = await db
      .update(users)
      .set({ faceDescriptors: descriptors, faceEnrolled: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!updated) throw notFound('User not found');

    res.json({ success: true, data: { faceEnrolled: true, descriptorCount: descriptors.length } });
  }),
);

export default router;
