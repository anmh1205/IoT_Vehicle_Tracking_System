import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { Sentry, isSentryInitialized } from '@/config/sentry';

/**
 * Sentry request handler — adds request context to Sentry scope.
 * No-op if Sentry is not initialized.
 */
export const sentryRequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  if (!isSentryInitialized()) {
    next();
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('correlationId', req.correlationId ?? 'unknown');
    scope.setExtra('path', req.path);
    scope.setExtra('method', req.method);
    next();
  });
};

/**
 * Sentry error handler — captures unhandled errors.
 * Must be placed BEFORE the main errorHandler middleware.
 * No-op if Sentry is not initialized.
 */
export const sentryErrorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (isSentryInitialized()) {
    Sentry.captureException(err, {
      tags: { correlationId: req.correlationId ?? 'unknown' },
      extra: { path: req.path, method: req.method },
    });
  }
  next(err);
};

/**
 * Utility to manually capture an error to Sentry.
 */
export const captureError = (error: Error, context?: Record<string, unknown>): void => {
  if (!isSentryInitialized()) return;
  Sentry.captureException(error, { extra: context });
};
