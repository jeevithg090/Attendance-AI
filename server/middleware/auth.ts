// JWT authentication middleware.
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { verifyToken, type Role } from '../services/authService';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  displayName: string;
  department: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

function extractToken(req: Request, allowQueryToken: boolean): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();
  // EventSource cannot send headers, so SSE endpoints accept ?token=.
  if (allowQueryToken && typeof req.query.token === 'string') return req.query.token;
  return null;
}

function createAuthenticator(allowQueryToken: boolean) {
  return async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const token = extractToken(req, allowQueryToken);
    if (!token) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      const expired = error instanceof jwt.TokenExpiredError;
      res.status(401).json({ success: false, error: expired ? 'Token expired' : 'Invalid token' });
      return;
    }

    try {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          displayName: users.displayName,
          department: users.department,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || !user.isActive) {
        res.status(401).json({ success: false, error: 'User not found or deactivated' });
        return;
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        department: user.department,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Requires `Authorization: Bearer <jwt>`. */
export const authenticate = createAuthenticator(false);

/** Like `authenticate`, but also accepts `?token=` for EventSource clients. */
export const authenticateSse = createAuthenticator(true);
