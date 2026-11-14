// Centralised, validated runtime configuration for the API server.
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  /** Comma-separated list of origins allowed to call the API (e.g. the Vercel URL). */
  FRONTEND_URL: z.string().default(''),
  /** Set to "false" to disable the background cron jobs (useful for serverless or tests). */
  ENABLE_CRON: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  /** Number of reverse proxies in front of the app (Railway/Render/etc. use 1). */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example for reference.`);
  }
  return parsed.data;
}

export const env = loadEnv();

const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];

export const allowedOrigins: string[] = [
  ...(env.NODE_ENV === 'production' ? [] : DEV_ORIGINS),
  ...env.FRONTEND_URL.split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
];
