import { pool } from '@/infrastructure/database/pool';
import * as vmRepo from '@/domain/system-admin/repositories/victoriametrics.repository';
import * as vlRepo from '@/domain/system-admin/repositories/victorialogs.repository';

interface HealthStatus {
  database: 'up' | 'down';
  timestamp: string;
}

export const getSystemHealth = async (): Promise<HealthStatus> => {
  try {
    await pool.query('SELECT 1');
    return { database: 'up', timestamp: new Date().toISOString() };
  } catch {
    return { database: 'down', timestamp: new Date().toISOString() };
  }
};

export const queryMetrics = async (
  promql: string,
  time?: string,
): Promise<unknown> => {
  const result = await vmRepo.query(promql, time);
  return result;
};

export const queryLogs = async (
  logsql: string,
  limit?: number,
): Promise<unknown> => {
  const result = await vlRepo.query(logsql, limit);
  return result;
};
