// Express application factory (no side effects: no listen, no cron).
import express from 'express';
import cors from 'cors';
import { allowedOrigins, env } from './config/env';
import { errorHandler, notFoundHandler } from './http/errors';
import attendanceRoutes from './routes/attendance';
import authRoutes from './routes/auth';
import notificationRoutes from './routes/notifications';
import sessionRoutes from './routes/sessions';
import settingsRoutes from './routes/settings';
import sseRoutes from './routes/sse';
import subjectRoutes from './routes/subjects';
import userRoutes from './routes/users';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  // Face enrolment sends up to 20 x 128 floats, comfortably below 1 MB.
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/subjects', subjectRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/sse', sseRoutes);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
