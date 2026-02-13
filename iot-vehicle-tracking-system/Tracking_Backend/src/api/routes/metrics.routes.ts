import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { registry } from '@/infrastructure/metrics/registry';
import { appConfig, observabilityConfig } from '@/config/env';

const router = Router();

/**
 * Basic auth guard for metrics endpoint.
 * Skipped in development when no METRICS_PASSWORD is set.
 */
const metricsAuth = (req: Request, res: Response, next: NextFunction): void => {
  const password = observabilityConfig.metricsPassword;

  // No auth required in dev when password is not configured
  if (!password && !appConfig.isProduction) {
    next();
    return;
  }

  // If password is configured, require basic auth
  if (password) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Metrics"');
      res
        .status(401)
        .json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      return;
    }

    const encoded = authHeader.slice(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [, pwd] = decoded.split(':');

    if (pwd !== password) {
      res
        .status(403)
        .json({ success: false, error: { code: 'FORBIDDEN', message: 'Invalid credentials' } });
      return;
    }
  }

  next();
};

/** GET /metrics — Prometheus metrics endpoint */
router.get('/', metricsAuth, async (_req, res) => {
  try {
    const metrics = await registry.metrics();
    res.set('Content-Type', registry.contentType);
    res.end(metrics);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'METRICS_ERROR', message: (err as Error).message },
    });
  }
});

export default router;
