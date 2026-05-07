import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from '@/components/providers/socket-provider';
import { healthServices } from '@/lib/api/system-status';

export type ServiceStatus = 'up' | 'down' | 'degraded';

export interface ServiceHealthItem {
  key: string;
  label: string;
  status: ServiceStatus;
  latencyMs?: number;
  error?: string;
  endpoint?: string;
  lastSeenAt?: string;
  details?: Record<string, unknown>;
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

const SERVICE_LABELS: Record<string, string> = {
  api: 'Backend API',
  postgresql: 'PostgreSQL',
  emqx: 'EMQX',
  mqttBridge: 'MQTT Bridge',
  victoriametrics: 'VictoriaMetrics',
  victoriaMetrics: 'VictoriaMetrics',
  victorialogs: 'VictoriaLogs',
  victoriaLogs: 'VictoriaLogs',
  grafana: 'Grafana',
};

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

  for (const [key, value] of Object.entries<any>(checks)) {
    const latencyMs = Number(value?.latencyMs ?? value?.latency_ms);
    rows.push({
      key,
      label: SERVICE_LABELS[key] ?? formatServiceLabel(key),
      status: normalizeStatus(value?.status),
      latencyMs: Number.isFinite(latencyMs) ? latencyMs : undefined,
      error: typeof value?.error === 'string' ? value.error : undefined,
      endpoint: typeof value?.endpoint === 'string' ? value.endpoint : undefined,
      lastSeenAt: typeof value?.lastSeenAt === 'string' ? value.lastSeenAt : undefined,
      details: value?.details && typeof value.details === 'object' ? value.details : undefined,
    });
  }

  if (rows.length > 0) {
    return rows;
  }

  if (error) {
    return [
      {
        key: 'health',
        label: 'Kiểm tra sức khỏe',
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
  const dashboardSocket = useSocket('dashboard');
  const healthQuery = useQuery({
    queryKey: ['system-status', 'health'],
    queryFn: () => healthServices.getHealth(),
    enabled,
  });

  const metricsQuery = useQuery({
    queryKey: ['system-status', 'metrics'],
    queryFn: () => healthServices.getMetrics().then(normalizeMetrics),
    enabled,
  });

  useEffect(() => {
    if (!dashboardSocket || !enabled) {
      return;
    }

    const refreshSnapshot = () => {
      void healthQuery.refetch();
      void metricsQuery.refetch();
    };

    dashboardSocket.on('connect', refreshSnapshot);
    dashboardSocket.on('system-admin:settings', refreshSnapshot);

    return () => {
      dashboardSocket.off('connect', refreshSnapshot);
      dashboardSocket.off('system-admin:settings', refreshSnapshot);
    };
  }, [dashboardSocket, enabled, healthQuery, metricsQuery]);

  return {
    healthQuery,
    metricsQuery,
    services: normalizeHealth(healthQuery.data, healthQuery.error),
    metrics: metricsQuery.data ?? null,
    healthNotice: healthQuery.isError
      ? toErrorMessage(healthQuery.error, 'Không tải được trạng thái các dịch vụ.')
      : null,
    metricsNotice: metricsQuery.isError
      ? toErrorMessage(metricsQuery.error, 'Chưa nhận được telemetry hạ tầng từ endpoint số liệu.')
      : null,
  };
};
