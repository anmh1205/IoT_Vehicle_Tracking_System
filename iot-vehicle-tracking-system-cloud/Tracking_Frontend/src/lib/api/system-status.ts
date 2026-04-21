import { apiClient, unwrap } from './client';

export interface SystemHealthCheck {
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  error?: string;
  endpoint?: string;
  lastSeenAt?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealthResponse {
  status: 'ok' | 'degraded' | 'down';
  checks: Record<string, SystemHealthCheck>;
  uptime: number;
  timestamp: string;
}

export interface SystemMetricsResponse {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
}

export const healthServices = {
  getHealth: () => apiClient.get('/system/health').then((r) => unwrap<SystemHealthResponse>(r.data)),
  getMetrics: () =>
    apiClient.get('/system/metrics').then((r) => unwrap<SystemMetricsResponse>(r.data)),
};
