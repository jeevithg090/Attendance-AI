// Server-Sent Events: live attendance updates for a session's teacher.
import { Router, type Response } from 'express';
import { asyncHandler } from '../http/errors';
import { uuidParam } from '../http/validation';
import { authenticateSse, type AuthenticatedRequest } from '../middleware/auth';
import { currentUser, requireRole } from '../middleware/rbac';
import { assertOwnsResource, getSessionOrThrow } from '../services/attendanceService';

const router = Router();

const KEEP_ALIVE_MS = 30_000;
const sessionClients = new Map<string, Set<Response>>();

// GET /api/sse/session/:sessionId
router.get(
  '/session/:sessionId',
  authenticateSse,
  requireRole('teacher', 'admin'),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const session = await getSessionOrThrow(uuidParam(req.params.sessionId));
    assertOwnsResource(currentUser(req), session.teacherId);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', sessionId: session.id })}\n\n`);

    let clients = sessionClients.get(session.id);
    if (!clients) {
      clients = new Set();
      sessionClients.set(session.id, clients);
    }
    clients.add(res);

    const keepAlive = setInterval(() => res.write(':ping\n\n'), KEEP_ALIVE_MS);

    req.on('close', () => {
      clearInterval(keepAlive);
      const set = sessionClients.get(session.id);
      set?.delete(res);
      if (set?.size === 0) sessionClients.delete(session.id);
    });
  }),
);

/** Push an event to every client listening on a session. */
export function broadcastToSession(sessionId: string, data: Record<string, unknown>) {
  const clients = sessionClients.get(sessionId);
  if (!clients) return;
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

export default router;
