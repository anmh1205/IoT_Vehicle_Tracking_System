import { apiClient, unwrap } from './client';

export const healthServices = {
  getHealth: () => apiClient.get('/health').then((r) => unwrap<any>(r.data)),
};
