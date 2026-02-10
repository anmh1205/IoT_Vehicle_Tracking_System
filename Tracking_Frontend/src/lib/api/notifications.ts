import { apiClient, unwrap } from './client';

export const notificationServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/notifications', { params }).then((r) => unwrap<any>(r.data)),
  markRead: (id: number) => apiClient.put(`/notifications/${id}/read`).then((r) => unwrap<any>(r.data)),
  markAllRead: () => apiClient.put('/notifications/mark-all-read').then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/notifications/${id}`).then((r) => unwrap<any>(r.data)),
};
