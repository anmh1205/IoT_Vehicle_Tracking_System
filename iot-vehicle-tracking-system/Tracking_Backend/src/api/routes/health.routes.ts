import { Router } from 'express';
import { pool } from '@/infrastructure/database/pool';
import { victoriaMetricsConfig } from '@/config/env';

const router = Router();

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  checks: Record<string, { status: 'ok' | 'down'; latencyMs?: number; error?: string }>;
  uptime: number;
  timestamp: string;
}

/** GET /health — Full status with dependency checks */
router.get('/', async (_req, res) => {
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

  res.status(allUp ? 200 : 503).json({ success: allUp, data: result, timestamp: result.timestamp });
});

/** GET /health/live — Liveness probe (is the process alive?) */
router.get('/live', (_req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'alive' },
    timestamp: new Date().toISOString(),
  });
});

/** GET /health/ready — Readiness probe (can it serve traffic?) */
router.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      success: true,
      data: { status: 'ready' },
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      success: false,
      error: { code: 'NOT_READY', message: 'Database is not reachable', status: 503 },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
