// HTTP error type, async route wrapper and the central error handler.
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const forbidden = (msg = 'Not authorized') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);

/** Wrap an async handler so rejected promises reach the error middleware. */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req as Req, res, next).catch(next);
  };
}

/** Postgres unique-violation detection (works for neon-http and node-postgres errors). */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string }; message?: string } | undefined;
  return e?.code === '23505' || e?.cause?.code === '23505' || /duplicate key/i.test(e?.message ?? '');
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: 'Route not found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    res.status(400).json({ success: false, error: message });
    return;
  }
  const status = (err as { status?: number; type?: string }).status;
  if (status && status >= 400 && status < 500) {
    // e.g. body-parser errors (malformed JSON, payload too large)
    res.status(status).json({ success: false, error: (err as Error).message });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
}
