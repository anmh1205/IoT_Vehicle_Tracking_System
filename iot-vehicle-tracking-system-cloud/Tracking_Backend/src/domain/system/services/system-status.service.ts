import { promises as fs } from 'node:fs';
import os from 'node:os';
import { pool } from '@/infrastructure/database/pool';
import { victoriaMetricsConfig } from '@/config/env';

type CheckStatus = 'ok' | 'down';

interface ServiceCheck {
  status: CheckStatus;
  latencyMs?: number;
  error?: string;
}

export interface SystemHealthPayload {
  status: 'ok' | 'degraded' | 'down';
  checks: Record<string, ServiceCheck>;
  uptime: number;
  timestamp: string;
}

export interface SystemMetricsPayload {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
}

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
};

const getDiskUsagePercent = async (): Promise<number> => {
  try {
    const stats = await fs.statfs(process.cwd());
    const totalBlocks = Number(stats.blocks ?? 0);
    const availableBlocks = Number(stats.bavail ?? stats.bfree ?? 0);
    if (totalBlocks <= 0) {
      return 0;
    }

    const used = totalBlocks - availableBlocks;
    return clampPercent((used / totalBlocks) * 100);
  } catch {
    return 0;
  }
};

export const getSystemHealth = async (): Promise<SystemHealthPayload> => {
  const checks: Record<string, ServiceCheck> = {
    api: { status: 'ok' },
  };

  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    checks.database = { status: 'ok', latencyMs: Date.now() - start };
  } catch (error) {
    checks.database = { status: 'down', error: (error as Error).message };
  }

  try {
    const start = Date.now();
    const response = await fetch(`${victoriaMetricsConfig.url}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    checks.victoriametrics = {
      status: response.ok ? 'ok' : 'down',
      latencyMs: Date.now() - start,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    checks.victoriametrics = { status: 'down', error: (error as Error).message };
  }

  const statuses = Object.values(checks).map((check) => check.status);
  const allUp = statuses.every((status) => status === 'ok');
  const allDown = statuses.every((status) => status === 'down');

  return {
    status: allUp ? 'ok' : allDown ? 'down' : 'degraded',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
};

export const getSystemMetrics = async (): Promise<SystemMetricsPayload> => {
  const cpuCount = Math.max(os.cpus().length, 1);
  const loadAverage = os.loadavg()[0];
  const cpuUsage = clampPercent((loadAverage / cpuCount) * 100);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memoryUsage = totalMem > 0 ? clampPercent(((totalMem - freeMem) / totalMem) * 100) : 0;

  const diskUsage = await getDiskUsagePercent();

  let activeConnections = 0;
  try {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM pg_stat_activity
       WHERE datname = current_database()`,
    );
    activeConnections = Number.parseInt(result.rows[0]?.count ?? '0', 10) || 0;
  } catch {
    activeConnections = 0;
  }

  return {
    cpuUsage: Number(cpuUsage.toFixed(2)),
    memoryUsage: Number(memoryUsage.toFixed(2)),
    diskUsage: Number(diskUsage.toFixed(2)),
    activeConnections,
  };
};
