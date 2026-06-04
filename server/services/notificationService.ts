// ═══════════════════════════════════════════════════════════
// AttendAI — Notification Service
// ═══════════════════════════════════════════════════════════

import { db } from '../db/connection';
import { notifications } from '../db/schema';

export async function createNotification(data: {
  recipientId: string;
  type: 'absent_alert' | 'low_attendance' | 'proxy_detected' | 'system';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const [notification] = await db.insert(notifications).values(data).returning();
  return notification;
}
