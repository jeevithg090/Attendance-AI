// ═══════════════════════════════════════════════════════════
// AttendAI — Auth Service (Password hashing, JWT generation)
// ═══════════════════════════════════════════════════════════

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function verifyToken(token: string): { userId: string; email: string; role: string } {
  return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string; role: string };
}
