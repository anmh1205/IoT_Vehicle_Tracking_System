import { Router } from 'express';
import { pool } from '@/infrastructure/database/pool';
import { victoriaMetricsConfig } from '@/config/env';
import { buildSuccessResponse } from '@/shared/serializers/success-response.serializer';
import { createApiError } from '@/shared/utils/errors.util';
import { serializeApiError } from '@/shared/serializers/problem-details.serializer';

const router = Router();

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  checks: Record<string, { status: 'ok' | 'down'; latencyMs?: number; error?: string }>;
  uptime: number;
  timestamp: string;
}

/** GET /health — Full status with dependency checks */
router.get('/', async (req, res) => {
  const checks: HealthCheck['checks'] = {};

  // Check PostgreSQL
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    checks.database = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    checks.database = { status: 'down', error: (err as Error).message };
  }

  // Check VictoriaMetrics
  try {
    const start = Date.now();
    const response = await fetch(`${victoriaMetricsConfig.url}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    checks.victoriametrics = {
      status: response.ok ? 'ok' : 'down',
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    checks.victoriametrics = { status: 'down', error: (err as Error).message };
  }

  const allUp = Object.values(checks).every((c) => c.status === 'ok');
  const allDown = Object.values(checks).every((c) => c.status === 'down');

  const result: HealthCheck = {
    status: allUp ? 'ok' : allDown ? 'down' : 'degraded',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  const requestId = req.correlationId ?? 'unknown';
  const payload = buildSuccessResponse(requestId, result);
  res.status(allUp ? 200 : 503).json(payload);
});

/** GET /health/live — Liveness probe (is the process alive?) */
router.get('/live', (req, res) => {
  const requestId = req.correlationId ?? 'unknown';
  res.status(200).json(buildSuccessResponse(requestId, { status: 'alive' }));
});

/** GET /health/ready — Readiness probe (can it serve traffic?) */
router.get('/ready', async (req, res) => {
  const requestId = req.correlationId ?? 'unknown';

  try {
    await pool.query('SELECT 1');
    res.status(200).json(buildSuccessResponse(requestId, { status: 'ready' }));
  } catch {
    const error = createApiError(503, 'Database is not reachable', { code: 'NOT_READY' });
    const payload = serializeApiError(error, req.path, requestId);
    res.type('application/problem+json');
    res.status(503).json(payload);
  }
});

export default router;
