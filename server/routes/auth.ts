// ═══════════════════════════════════════════════════════════
// AttendAI — Auth Routes
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateToken } from '../services/authService';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// ── POST /api/auth/login ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password required' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, error: 'Account deactivated. Contact administrator.' });
      return;
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      data: {
        token,
        user: userWithoutPassword,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message,
      dbPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 35) : 'missing',
      stack: error.stack
    });
  }
});

// ── POST /api/auth/register (admin only) ─────────────────
router.post('/register', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const { email, password, displayName, role, department, enrollmentId, employeeId, phone } = req.body;

    if (!email || !password || !displayName || !role || !department) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Check if email already exists
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = await db.insert(users).values({
      email,
      passwordHash: hashedPassword,
      displayName,
      role,
      department,
      enrollmentId: role === 'student' ? enrollmentId : null,
      employeeId: role === 'teacher' ? employeeId : null,
      phone,
    }).returning();

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PUT /api/auth/profile ────────────────────────────────
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { displayName, phone, photoUrl } = req.body;

    const [updated] = await db.update(users)
      .set({
        ...(displayName && { displayName }),
        ...(phone !== undefined && { phone }),
        ...(photoUrl !== undefined && { photoUrl }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.id))
      .returning();

    const { passwordHash: _, ...userWithoutPassword } = updated;
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
