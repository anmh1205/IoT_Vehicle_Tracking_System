import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { registry } from '@/infrastructure/metrics/registry';
import { appConfig, observabilityConfig } from '@/config/env';
import { createApiError } from '@/shared/utils/errors.util';
import { serializeApiError } from '@/shared/serializers/problem-details.serializer';

const router = Router();

const sendProblem = (req: Request, res: Response, status: number, code: string, detail: string): void => {
  const requestId = req.correlationId ?? 'unknown';
  const error = createApiError(status, detail, { code });
  const payload = serializeApiError(error, req.path, requestId);
  res.type('application/problem+json');
  res.status(status).json(payload);
};

/**
 * Basic auth guard for metrics endpoint.
 * Skipped in development when no METRICS_PASSWORD is set.
 */
const metricsAuth = (req: Request, res: Response, next: NextFunction): void => {
  const password = observabilityConfig.metricsPassword;

  if (!password) {
    if (appConfig.isProduction) {
      sendProblem(req, res, 503, 'METRICS_NOT_CONFIGURED', 'METRICS_PASSWORD is required in production');
      return;
    }

    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Metrics"');
    sendProblem(req, res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const encoded = authHeader.slice(6);
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const [, pwd] = decoded.split(':');

  if (pwd !== password) {
    sendProblem(req, res, 403, 'FORBIDDEN', 'Invalid credentials');
    return;
  }

  next();
};
/** GET /metrics — Prometheus metrics endpoint */
router.get('/', metricsAuth, async (req, res) => {
  try {
    const metrics = await registry.metrics();
    res.set('Content-Type', registry.contentType);
    res.end(metrics);
  } catch {
    sendProblem(req, res, 500, 'METRICS_ERROR', 'Failed to collect metrics');
  }
});

export default router;
