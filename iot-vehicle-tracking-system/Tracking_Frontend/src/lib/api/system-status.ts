import { apiClient, unwrap } from './client';

export const healthServices = {
  getHealth: () => apiClient.get('/system/health').then((r) => unwrap<any>(r.data)),
  getMetrics: () => apiClient.get('/system/metrics').then((r) => unwrap<any>(r.data)),
};
