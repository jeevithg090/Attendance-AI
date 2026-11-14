// Role-based access control middleware.
import type { NextFunction, Response } from 'express';
import type { Role } from '../services/authService';
import type { AuthenticatedRequest } from './auth';

export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: `Access denied. Required role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
}

/** Narrow `req.user` after `authenticate` has run. */
export function currentUser(req: AuthenticatedRequest) {
  if (!req.user) throw new Error('authenticate middleware must run before this handler');
  return req.user;
}
