// ═══════════════════════════════════════════════════════════
// AttendAI — System Settings Routes
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { db } from '../db/connection';
import { systemSettings, auditLogs } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();
router.use(authenticate);

// ── GET /api/settings ────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    let [settings] = await db.select().from(systemSettings)
      .where(eq(systemSettings.id, 'global')).limit(1);

    // Create default if not exists
    if (!settings) {
      [settings] = await db.insert(systemSettings).values({ id: 'global' }).returning();
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PUT /api/settings ────────────────────────────────────
router.put('/', requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const updates = req.body;

    const [updated] = await db.update(systemSettings)
      .set(updates)
      .where(eq(systemSettings.id, 'global'))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'UPDATE_SETTINGS',
      details: updates,
      ipAddress: (req.ip || req.headers['x-forwarded-for'] as string) || undefined,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/settings/audit-logs ─────────────────────────
router.get('/audit-logs', requireRole('admin'), async (_req, res) => {
  try {
    const logs = await db.select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
