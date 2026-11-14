// System settings & audit log routes.
import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { auditLogs, systemSettings } from '../db/schema';
import { asyncHandler, badRequest } from '../http/errors';
import { settingsUpdateSchema } from '../http/validation';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { currentUser, requireRole } from '../middleware/rbac';
import { GLOBAL_SETTINGS_ID, getSettings } from '../services/settingsService';

const router = Router();
router.use(authenticate);

// GET /api/settings
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await getSettings() });
  }),
);

// PUT /api/settings (admin)
router.put(
  '/',
  requireRole('admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    // The UI posts the whole settings object; drop the read-only id before validating.
    const { id: _id, ...body } = (req.body ?? {}) as Record<string, unknown>;
    const updates = settingsUpdateSchema.parse(body);
    if (Object.keys(updates).length === 0) throw badRequest('No settings provided');

    await getSettings(); // ensure the row exists
    const [updated] = await db
      .update(systemSettings)
      .set(updates)
      .where(eq(systemSettings.id, GLOBAL_SETTINGS_ID))
      .returning();

    await db.insert(auditLogs).values({
      userId: currentUser(req).id,
      action: 'UPDATE_SETTINGS',
      details: updates,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updated });
  }),
);

// GET /api/settings/audit-logs (admin)
router.get(
  '/audit-logs',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    res.json({ success: true, data: logs });
  }),
);

export default router;
