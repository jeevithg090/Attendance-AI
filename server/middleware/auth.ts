// ═══════════════════════════════════════════════════════════
// AttendAI — JWT Authentication Middleware
// ═══════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
    displayName: string;
    department: string;
  };
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    } else {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: string;
    };

    const [user] = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      displayName: users.displayName,
      department: users.department,
      isActive: users.isActive,
    }).from(users).where(eq(users.id, decoded.userId)).limit(1);

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'User not found or deactivated' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as 'student' | 'teacher' | 'admin',
      displayName: user.displayName,
      department: user.department,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
}
