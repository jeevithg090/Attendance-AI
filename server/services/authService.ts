// Password hashing and JWT helpers.
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

const SALT_ROUNDS = 12;

export type Role = 'student' | 'teacher' | 'admin';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHashPromise: Promise<string> | null = null;

/** A valid bcrypt hash used to equalise timing when a login email does not exist. */
export function dummyHash(): Promise<string> {
  dummyHashPromise ??= bcrypt.hash('timing-safe-placeholder', SALT_ROUNDS);
  return dummyHashPromise;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || typeof decoded.userId !== 'string') {
    throw new jwt.JsonWebTokenError('Malformed token payload');
  }
  return decoded as unknown as TokenPayload;
}
