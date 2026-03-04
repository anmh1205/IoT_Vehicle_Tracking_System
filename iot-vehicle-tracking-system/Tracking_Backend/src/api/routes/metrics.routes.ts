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

  if (!password) {
    if (appConfig.isProduction) {
      res.status(503).json({
        success: false,
        error: { code: 'METRICS_NOT_CONFIGURED', message: 'METRICS_PASSWORD is required in production' },
      });
      return;
    }

    // No auth required in development when password is not configured
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Metrics"');
    res.status(401).json({
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
