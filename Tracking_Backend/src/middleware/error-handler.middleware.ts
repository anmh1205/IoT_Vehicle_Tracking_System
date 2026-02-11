import type { Request, Response, NextFunction } from 'express';
import { isApiError } from '@/shared/utils/errors.util';
import { logger } from '@/infrastructure/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const correlationId = req.correlationId ?? 'unknown';

  if (isApiError(err)) {
    logger.warn(`[${correlationId}] ${err.status} ${err.message}`, {
      path: req.path,
      method: req.method,
      details: err.details,
    });

    res.status(err.status).json({
      success: false,
      error: {
        code: (err.details?.code as string) ?? 'ERROR',
        message: err.message,
        status: err.status,
        path: req.path,
        details: err.details,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  logger.error(`[${correlationId}] Unhandled error: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      status: 500,
      path: req.path,
    },
    timestamp: new Date().toISOString(),
  });
};
