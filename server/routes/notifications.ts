// ═══════════════════════════════════════════════════════════
// AttendAI — Notification Routes
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { db } from '../db/connection';
import { notifications } from '../db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── GET /api/notifications ───────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { unreadOnly } = req.query;
    const conditions = [eq(notifications.recipientId, req.user!.id)];

    if (unreadOnly === 'true') {
      conditions.push(eq(notifications.read, false));
    }

    const result = await db.select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const [unreadCount] = await db.select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.recipientId, req.user!.id),
        eq(notifications.read, false)
      ));

    res.json({
      success: true,
      data: { notifications: result, unreadCount: unreadCount?.count || 0 },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PUT /api/notifications/:id/read ──────────────────────
router.put('/:id/read', async (req: AuthenticatedRequest, res) => {
  try {
    await db.update(notifications)
      .set({ read: true })
      .where(and(
        eq(notifications.id, req.params.id),
        eq(notifications.recipientId, req.user!.id)
      ));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PUT /api/notifications/read-all ──────────────────────
router.put('/read-all', async (req: AuthenticatedRequest, res) => {
  try {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.recipientId, req.user!.id));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
