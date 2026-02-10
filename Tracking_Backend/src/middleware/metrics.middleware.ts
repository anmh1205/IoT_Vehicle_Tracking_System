import type { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '@/infrastructure/metrics/app-metrics';

/**
 * Normalize route path for metric labels to avoid high-cardinality.
 * Replaces UUIDs and numeric IDs with `:id`.
 */
const normalizePath = (req: Request): string => {
  // Use the matched Express route if available
  if (req.route?.path) {
    return `${req.baseUrl}${req.route.path}`;
  }
  // Fallback: replace UUIDs and numeric segments
  return req.path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id');
};

export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startHrTime = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - startHrTime);
    const durationSec = durationNs / 1e9;
    const path = normalizePath(req);
    const labels = {
      method: req.method,
      path,
      status: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSec);
  });

  next();
};
