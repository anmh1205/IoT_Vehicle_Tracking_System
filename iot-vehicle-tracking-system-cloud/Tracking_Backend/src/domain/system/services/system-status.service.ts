import { promises as fs } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import { pool } from '@/infrastructure/database/pool';
import { bridgeConfig, mqttConfig, victoriaLogsConfig, victoriaMetricsConfig } from '@/config/env';

type CheckStatus = 'ok' | 'degraded' | 'down';

interface ServiceCheck {
  status: CheckStatus;
  latencyMs?: number;
  error?: string;
  endpoint?: string;
  lastSeenAt?: string;
  details?: Record<string, unknown>;
}

interface BridgeFlowSignal {
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  lastSeenAt?: string;
  error?: string;
  details?: Record<string, unknown>;
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

const HEALTH_TIMEOUT_MS = 3000;
const BRIDGE_OK_WINDOW_MS = 15 * 60 * 1000;
const BRIDGE_DEGRADED_WINDOW_MS = 60 * 60 * 1000;

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
};

const httpHealthCheck = async (
  endpoint: string,
  timeoutMs = HEALTH_TIMEOUT_MS,
): Promise<ServiceCheck> => {
  try {
    const start = Date.now();
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = response.headers.get('content-type') ?? '';
    let details: Record<string, unknown> | undefined;

    if (contentType.includes('application/json')) {
      try {
        const payload = await response.json();
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          details = payload as Record<string, unknown>;
        }
      } catch {
        details = undefined;
      }
    }

    return {
      status: response.ok ? 'ok' : 'down',
      latencyMs: Date.now() - start,
      endpoint,
      details,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'down',
      endpoint,
      error: toErrorMessage(error, 'Không gọi được endpoint kiểm tra sức khỏe.'),
    };
  }
};

const tcpHealthCheck = async (
  host: string,
  ports: number[],
  timeoutMs = HEALTH_TIMEOUT_MS,
): Promise<ServiceCheck> => {
  let lastError: string | undefined;

  for (const port of ports.filter((value) => Number.isFinite(value) && value > 0)) {
    try {
      const start = Date.now();
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host, port });
        const cleanup = () => {
          socket.removeAllListeners();
          socket.destroy();
        };

        socket.setTimeout(timeoutMs);
        socket.once('connect', () => {
          cleanup();
          resolve();
        });
        socket.once('timeout', () => {
          cleanup();
          reject(new Error(`Timeout connecting to ${host}:${port}`));
        });
        socket.once('error', (error) => {
          cleanup();
          reject(error);
        });
      });

      return {
        status: 'ok',
        latencyMs: Date.now() - start,
        endpoint: `${host}:${port}`,
      };
    } catch (error) {
      lastError = toErrorMessage(error, `Không kết nối được tới ${host}:${port}`);
    }
  }

  return {
    status: 'down',
    endpoint: `${host}:${ports.join(',')}`,
    error: lastError ?? 'Không có cổng hợp lệ để kiểm tra.',
  };
};

const getBridgeFlowSignal = async (): Promise<BridgeFlowSignal> => {
  try {
    const result = await pool.query<{
      last_seen_at: Date | string | null;
      recent_count: string;
      total_count: string;
    }>(
      `SELECT MAX(server_timestamp) AS last_seen_at,
              COUNT(*) FILTER (WHERE server_timestamp >= NOW() - INTERVAL '5 minutes')::text AS recent_count,
              COUNT(*)::text AS total_count
       FROM event_logs
       WHERE event_code = 'mqtt_bridge_rawdata'
          OR (context->>'source' = 'mqtt_bridge_rawdata')`,
    );

    const row = result.rows[0];
    const totalCount = Number(row?.total_count ?? 0);
    const recentCount = Number(row?.recent_count ?? 0);
    const lastSeenAt = row?.last_seen_at ? new Date(row.last_seen_at).toISOString() : undefined;
    const lastSeenMs = lastSeenAt ? Date.parse(lastSeenAt) : Number.NaN;
    const ageMs = Number.isFinite(lastSeenMs) ? Date.now() - lastSeenMs : undefined;

    if (totalCount <= 0) {
      return {
        status: 'down',
        error: 'Chưa có bản tin rawdata nào đi qua MQTT Bridge.',
        details: { totalCount, recentCount },
      };
    }

    if (ageMs !== undefined && ageMs <= BRIDGE_OK_WINDOW_MS) {
      return {
        status: 'ok',
        lastSeenAt,
        details: { totalCount, recentCount, ageMs },
      };
    }

    if (ageMs !== undefined && ageMs <= BRIDGE_DEGRADED_WINDOW_MS) {
      return {
        status: 'degraded',
        lastSeenAt,
        error: 'Luồng rawdata từ MQTT Bridge đang chậm hơn ngưỡng kỳ vọng.',
        details: { totalCount, recentCount, ageMs },
      };
    }

    return {
      status: 'down',
      lastSeenAt,
      error: 'Không thấy rawdata gần đây từ MQTT Bridge.',
      details: { totalCount, recentCount, ageMs },
    };
  } catch (error) {
    return {
      status: 'unknown',
      error: toErrorMessage(error, 'Không truy vấn được tín hiệu rawdata của MQTT Bridge.'),
    };
  }
};

const getGrafanaBaseUrl = (): string =>
  process.env.GRAFANA_URL?.trim() || 'http://tracking-grafana:4002';

const getBridgeHealth = async (): Promise<ServiceCheck> => {
  const readiness = await httpHealthCheck(`${bridgeConfig.healthUrl}/ready`);
  const flow = await getBridgeFlowSignal();
  const details = {
    readiness: readiness.details ?? null,
    flow: flow.details ?? null,
    flowStatus: flow.status,
  };

  if (readiness.status === 'down') {
    return {
      status: 'down',
      latencyMs: readiness.latencyMs,
      endpoint: readiness.endpoint,
      error: readiness.error ?? 'MQTT Bridge không phản hồi readiness check.',
      lastSeenAt: flow.lastSeenAt,
      details,
    };
  }

  if (flow.status === 'ok') {
    return {
      status: 'ok',
      latencyMs: readiness.latencyMs,
      endpoint: readiness.endpoint,
      lastSeenAt: flow.lastSeenAt,
      details,
    };
  }

  return {
    status: 'degraded',
    latencyMs: readiness.latencyMs,
    endpoint: readiness.endpoint,
    lastSeenAt: flow.lastSeenAt,
    error:
      flow.error ??
      (flow.status === 'unknown'
        ? 'MQTT Bridge đang chạy nhưng chưa đánh giá được luồng dữ liệu.'
        : 'MQTT Bridge đang chạy nhưng chưa có rawdata gần đây.'),
    details,
  };
};

const getDatabaseHealth = async (): Promise<ServiceCheck> => {
  try {
    const start = Date.now();
    const result = await pool.query<{ database: string }>('SELECT current_database() AS database');
    return {
      status: 'ok',
      latencyMs: Date.now() - start,
      details: { database: result.rows[0]?.database ?? null },
    };
  } catch (error) {
    return {
      status: 'down',
      error: toErrorMessage(error, 'Không kết nối được PostgreSQL.'),
    };
  }
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
  const [postgresql, emqx, mqttBridge, victoriaMetrics, victoriaLogs, grafana] =
    await Promise.all([
      getDatabaseHealth(),
      tcpHealthCheck(mqttConfig.host, [mqttConfig.useTls ? mqttConfig.tlsPort : mqttConfig.port]),
      getBridgeHealth(),
      httpHealthCheck(`${victoriaMetricsConfig.url}/-/healthy`),
      httpHealthCheck(`${victoriaLogsConfig.url}/-/healthy`),
      httpHealthCheck(`${getGrafanaBaseUrl()}/api/health`),
    ]);

  const checks: Record<string, ServiceCheck> = {
    api: { status: 'ok', details: { service: 'Tracking_Backend' } },
    postgresql,
    emqx,
    mqttBridge,
    victoriaMetrics,
    victoriaLogs,
    grafana,
  };

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
