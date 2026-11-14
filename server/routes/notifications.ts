// Per-user notification routes.
import { Router } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { notifications } from '../db/schema';
import { asyncHandler } from '../http/errors';
import { uuidParam } from '../http/validation';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { currentUser } from '../middleware/rbac';

const router = Router();
router.use(authenticate);

// GET /api/notifications
router.get(
  '/',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const me = currentUser(req);
    const mine = eq(notifications.recipientId, me.id);
    const unread = and(mine, eq(notifications.read, false));

    const [items, [unreadRow]] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(req.query.unreadOnly === 'true' ? unread : mine)
        .orderBy(desc(notifications.createdAt))
        .limit(50),
      db.select({ n: count() }).from(notifications).where(unread),
    ]);

    res.json({ success: true, data: { notifications: items, unreadCount: unreadRow?.n ?? 0 } });
  }),
);

// PUT /api/notifications/read-all
router.put(
  '/read-all',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    await db.update(notifications).set({ read: true }).where(eq(notifications.recipientId, currentUser(req).id));
    res.json({ success: true });
  }),
);

// PUT /api/notifications/:id/read
router.put(
  '/:id/read',
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, uuidParam(req.params.id)), eq(notifications.recipientId, currentUser(req).id)));
    res.json({ success: true });
  }),
);

export default router;
