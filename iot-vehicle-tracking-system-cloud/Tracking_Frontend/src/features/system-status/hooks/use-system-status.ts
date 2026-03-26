import { useQuery } from '@tanstack/react-query';
import { healthServices } from '@/lib/api/system-status';

export type ServiceStatus = 'up' | 'down' | 'degraded';

export interface ServiceHealthItem {
  key: string;
  label: string;
  status: ServiceStatus;
  latencyMs?: number;
  error?: string;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
}

const formatServiceLabel = (key: string) =>
  key
    .split(/[._-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const normalizeStatus = (value: unknown): ServiceStatus => {
  if (value === 'ok' || value === 'up') {
    return 'up';
  }
  if (value === 'degraded' || value === 'warn') {
    return 'degraded';
  }
  return 'down';
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

const normalizeHealth = (payload: any, error?: unknown): ServiceHealthItem[] => {
  const checks = payload?.checks ?? {};
  const rows: ServiceHealthItem[] = [];

  if (payload?.status) {
    rows.push({
      key: 'backend',
      label: 'Backend API',
      status: normalizeStatus(payload.status),
    });
  }

  for (const [key, value] of Object.entries<any>(checks)) {
    const latencyMs = Number(value?.latencyMs ?? value?.latency_ms);
    rows.push({
      key,
      label: formatServiceLabel(key),
      status: normalizeStatus(value?.status),
      latencyMs: Number.isFinite(latencyMs) ? latencyMs : undefined,
      error: typeof value?.error === 'string' ? value.error : undefined,
    });
  }

  if (rows.length > 0) {
    return rows;
  }

  if (error) {
    return [
      {
        key: 'health',
        label: 'Health Check',
        status: 'down',
        error: toErrorMessage(error, 'Không tải được trạng thái sức khỏe hệ thống.'),
      },
    ];
  }

  return [];
};

const normalizeMetrics = (payload: any): SystemMetrics => ({
  cpuUsage: Number(payload?.cpuUsage ?? payload?.cpu ?? 0),
  memoryUsage: Number(payload?.memoryUsage ?? payload?.memory ?? 0),
  diskUsage: Number(payload?.diskUsage ?? payload?.disk ?? 0),
  activeConnections: Number(payload?.activeConnections ?? payload?.connections ?? 0),
});

export const useSystemStatus = (enabled = true) => {
  const healthQuery = useQuery({
    queryKey: ['system-status', 'health'],
    queryFn: () => healthServices.getHealth(),
    refetchInterval: 30000,
    enabled,
  });

  const metricsQuery = useQuery({
    queryKey: ['system-status', 'metrics'],
    queryFn: () => healthServices.getMetrics().then(normalizeMetrics),
    refetchInterval: 30000,
    enabled,
  });

  return {
    healthQuery,
    metricsQuery,
    services: normalizeHealth(healthQuery.data, healthQuery.error),
    metrics: metricsQuery.data ?? null,
    healthNotice: healthQuery.isError
      ? toErrorMessage(healthQuery.error, 'Không tải được trạng thái các dịch vụ.')
      : null,
    metricsNotice: metricsQuery.isError
      ? toErrorMessage(metricsQuery.error, 'Chưa nhận được telemetry hạ tầng từ endpoint metrics.')
      : null,
  };
};
