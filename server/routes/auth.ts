// Authentication & profile routes.
import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { asyncHandler, conflict, HttpError, isUniqueViolation, notFound } from '../http/errors';
import { loginSchema, profileUpdateSchema, registerSchema } from '../http/validation';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { currentUser, requireRole } from '../middleware/rbac';
import { dummyHash, generateToken, hashPassword, verifyPassword } from '../services/authService';
import { toPublicUser } from '../services/userService';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    // Always run bcrypt so response time doesn't reveal whether the email exists.
    const passwordValid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
    if (!user || !passwordValid) throw new HttpError(401, 'Invalid credentials');
    if (!user.isActive) throw new HttpError(403, 'Account deactivated. Contact administrator.');

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    res.json({ success: true, data: { token, user: toPublicUser(user) } });
  }),
);

// POST /api/auth/register (admin only)
router.post(
  '/register',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${input.email}`)
      .limit(1);
    if (existing) throw conflict('Email already registered');

    try {
      const [created] = await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash: await hashPassword(input.password),
          displayName: input.displayName,
          role: input.role,
          department: input.department,
          enrollmentId: input.role === 'student' ? input.enrollmentId || null : null,
          employeeId: input.role === 'teacher' ? input.employeeId || null : null,
          phone: input.phone || null,
        })
        .returning();
      res.status(201).json({ success: true, data: toPublicUser(created) });
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict('Email, enrollment ID or employee ID already exists');
      throw error;
    }
  }),
);

// GET /api/auth/me
router.get(
  '/me',
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser(req).id))
      .limit(1);
    if (!user) throw notFound('User not found');
    res.json({ success: true, data: toPublicUser(user) });
  }),
);

// PUT /api/auth/profile
router.put(
  '/profile',
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const input = profileUpdateSchema.parse(req.body);
    const [updated] = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, currentUser(req).id))
      .returning();
    res.json({ success: true, data: toPublicUser(updated) });
  }),
);

export default router;
