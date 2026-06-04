// ═══════════════════════════════════════════════════════════
// AttendAI — Role-Based Access Control Middleware
// ═══════════════════════════════════════════════════════════

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

type Role = 'student' | 'teacher' | 'admin';

export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}
