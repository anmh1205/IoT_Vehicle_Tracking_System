import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { serializeApiError } from '@/shared/serializers/problem-details.serializer';
import { createApiError } from '@/shared/utils/errors.util';

const respondRateLimitError = (req: Request, res: Response, detail: string): void => {
  const requestId = req.correlationId ?? 'unknown';
  const error = createApiError(429, detail, { code: 'RATE_LIMIT_EXCEEDED' });
  const payload = serializeApiError(error, req.path, requestId);

  res.type('application/problem+json');
  res.status(429).json(payload);
};

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    respondRateLimitError(req, res, 'Too many authentication attempts, please try again later');
  },
});

export const generalRateLimit = rateLimit({
  windowMs: 30 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    respondRateLimitError(req, res, 'Too many requests, please try again later');
  },
});
