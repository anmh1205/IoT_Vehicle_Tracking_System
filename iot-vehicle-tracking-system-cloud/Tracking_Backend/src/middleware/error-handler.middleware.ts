import type { Request, Response, NextFunction } from 'express';
import { isApiError } from '@/shared/utils/errors.util';
import { logger } from '@/infrastructure/logger';
import { serializeProblem } from '@/shared/serializers/problem-details.serializer';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = req.correlationId ?? 'unknown';

  if (isApiError(err)) {
    logger.warn(`[${requestId}] ${err.status} ${err.message}`, {
      path: req.path,
      method: req.method,
      details: err.details,
    });

    const payload = serializeProblem(err, req.path, requestId);
    res.type('application/problem+json');
    res.status(err.status).json(payload);
    return;
  }

  logger.error(`[${requestId}] Unhandled error: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  const payload = serializeProblem(err, req.path, requestId);
  res.type('application/problem+json');
  res.status(500).json(payload);
};
