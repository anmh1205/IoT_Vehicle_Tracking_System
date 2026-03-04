import { apiClient, unwrap } from './client';

export const mapServices = {
  getPositions: () => apiClient.get('/devices/positions').then((r) => unwrap<any>(r.data)),
};
