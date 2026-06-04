// ═══════════════════════════════════════════════════════════
// AttendAI — Server-Sent Events (SSE) for Real-time Updates
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Store active SSE connections per session
const sessionClients = new Map<string, Set<{
  id: string;
  res: any;
}>>();

// ── GET /api/sse/session/:sessionId ──────────────────────
router.get('/session/:sessionId', authenticate, (req: AuthenticatedRequest, res) => {
  const sessionId = req.params.sessionId;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

  // Add to clients
  const client = { id: req.user!.id, res };
  if (!sessionClients.has(sessionId)) {
    sessionClients.set(sessionId, new Set());
  }
  sessionClients.get(sessionId)!.add(client);

  // Keep-alive ping every 30 seconds
  const keepAlive = setInterval(() => {
    res.write(':ping\n\n');
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    sessionClients.get(sessionId)?.delete(client);
    if (sessionClients.get(sessionId)?.size === 0) {
      sessionClients.delete(sessionId);
    }
  });
});

// ── Broadcast to session clients ─────────────────────────
export function broadcastToSession(sessionId: string, data: Record<string, unknown>) {
  const clients = sessionClients.get(sessionId);
  if (!clients) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    try {
      client.res.write(message);
    } catch {
      clients.delete(client);
    }
  });
}

export default router;
