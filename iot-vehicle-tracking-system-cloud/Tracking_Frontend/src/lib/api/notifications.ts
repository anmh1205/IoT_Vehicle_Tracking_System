import { apiClient, unwrap } from './client';
import type {
  NotificationListResponse,
  NotificationStatsSummary,
} from '@/features/notifications/types';
import type { NotificationsQueryParams } from '@/features/notifications/hooks/use-notifications';

export const notificationServices = {
  getList: (params?: NotificationsQueryParams) =>
    apiClient
      .get('/notifications', { params })
      .then((r) => unwrap<NotificationListResponse>(r.data)),
  markRead: (id: number) =>
    apiClient.put(`/notifications/${id}/read`).then((r) => unwrap<any>(r.data)),
  markAllRead: () => apiClient.put('/notifications/mark-all-read').then((r) => unwrap<any>(r.data)),
  getStats: () =>
    apiClient.get('/notifications/stats').then((r) => unwrap<NotificationStatsSummary>(r.data)),
  registerPushToken: (token: string, deviceInfo?: Record<string, unknown>) =>
    apiClient
      .post('/notifications/push-token', { token, deviceInfo })
      .then((r) => unwrap<{ success: boolean }>(r.data)),
  unregisterPushToken: (token: string) =>
    apiClient
      .delete('/notifications/push-token', { data: { token } })
      .then((r) => unwrap<{ success: boolean }>(r.data)),
  delete: (id: number) => apiClient.delete(`/notifications/${id}`).then((r) => unwrap<any>(r.data)),
};
