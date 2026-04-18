import { apiClient } from './client';
import { unwrap } from './client';
import type { User } from '@/lib/stores/auth-store';

export interface NotificationChannelState {
  enabled: boolean;
  webhookUrl: string | null;
}

export interface TelegramChannelState {
  enabled: boolean;
  botToken: string | null;
  chatId: string | null;
}

export interface NotificationSettings {
  emailAlerts: boolean;
  pushAlerts: boolean;
  alertTypes: string[];
  channels: {
    discord: NotificationChannelState;
    telegram: TelegramChannelState;
  };
}

export interface UpdateNotificationSettingsInput {
  emailAlerts?: boolean;
  pushAlerts?: boolean;
  alertTypes?: string[];
  channels?: {
    discord?: {
      enabled?: boolean;
      webhookUrl?: string | null;
    };
    telegram?: {
      enabled?: boolean;
      botToken?: string | null;
      chatId?: string | null;
    };
  };
}

export const authServices = {
  login: (data: { username: string; password: string }) =>
    apiClient
      .post('/auth/login', data)
      .then((r) => unwrap<{ user: User; token: string; expiresAt: string }>(r.data)),

  logout: () => apiClient.post('/auth/logout').then((r) => unwrap<{ message: string }>(r.data)),

  getMe: () =>
    apiClient.get('/auth/me').then((r) => unwrap<{ user: User; token: string | null }>(r.data)),

  refresh: () =>
    apiClient
      .post('/auth/refresh')
      .then((r) => unwrap<{ user: User; token: string | null }>(r.data)),

  updateProfile: (data: { fullName?: string; email?: string | null; avatarUrl?: string | null }) =>
    apiClient.put('/auth/profile', data).then((r) => unwrap<User>(r.data)),

  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/auth/change-password', data).then((r) => unwrap<{ message: string }>(r.data)),

  updateNotifications: (data: UpdateNotificationSettingsInput) =>
    apiClient
      .put('/auth/notifications', data)
      .then((r) => unwrap<{ preferences: NotificationSettings }>(r.data)),

  getNotificationSettings: () =>
    apiClient
      .get('/users/notification-settings')
      .then((r) => unwrap<{ preferences: NotificationSettings }>(r.data)),

  updateNotificationSettings: (data: UpdateNotificationSettingsInput) =>
    apiClient
      .put('/users/notification-settings', data)
      .then((r) => unwrap<{ preferences: NotificationSettings }>(r.data)),
};
