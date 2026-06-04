// ═══════════════════════════════════════════════════════════
// AttendAI — Express Server Entry Point
// ═══════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import dotenv from 'dotenv';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import subjectRoutes from './routes/subjects';
import sessionRoutes from './routes/sessions';
import attendanceRoutes from './routes/attendance';
import notificationRoutes from './routes/notifications';
import settingsRoutes from './routes/settings';
import sseRoutes from './routes/sse';

// Import cron jobs
import { refreshSessionTokens } from './jobs/tokenRefresh';
import { cleanupExpiredSessions } from './jobs/sessionCleanup';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────
// Unconditionally allow both local development and the Vercel production URL
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174', 
  'http://localhost:3000',
  'https://attendance-project-gamma.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Large limit for face descriptors
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── API Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sse', sseRoutes);

// ── Health check ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Error handler ────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Cron Jobs ────────────────────────────────────────────
// Refresh session tokens every minute
cron.schedule('* * * * *', () => {
  refreshSessionTokens();
});

// Cleanup expired sessions every 5 minutes
cron.schedule('*/5 * * * *', () => {
  cleanupExpiredSessions();
});

// ── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   🎓 AttendAI Server Running                     ║
║   📍 http://localhost:${PORT}                      ║
║   🏫 BMSCE Anti-Proxy Attendance System          ║
║   📡 API: http://localhost:${PORT}/api              ║
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);
});

export default app;
