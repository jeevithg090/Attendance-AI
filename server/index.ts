// API server entry point: starts HTTP listener and background jobs.
import cron from 'node-cron';
import { allowedOrigins, env } from './config/env';
import { createApp } from './app';
import { cleanupExpiredSessions } from './jobs/sessionCleanup';
import { refreshSessionTokens } from './jobs/tokenRefresh';

const app = createApp();

if (env.ENABLE_CRON) {
  cron.schedule('* * * * *', () => void refreshSessionTokens());
  cron.schedule('*/5 * * * *', () => void cleanupExpiredSessions());
}

const server = app.listen(env.PORT, () => {
  console.log(`AttendAI API listening on http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
  console.log(`CORS origins: ${allowedOrigins.join(', ') || '(none)'}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
