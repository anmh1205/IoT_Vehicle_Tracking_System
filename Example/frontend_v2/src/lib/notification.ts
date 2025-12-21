import { toast } from 'sonner';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationConfig {
  type: NotificationType;
  title: string;
  description?: string;
  duration?: number;
}

type NotificationApi = Record<
  NotificationType,
  (payload: Omit<NotificationConfig, 'type'>) => void
>;

const defaultNotificationApi: NotificationApi = {
  success: ({ title, description, duration }) =>
    toast.success(title, { description, duration }),
  error: ({ title, description, duration }) =>
    toast.error(title, { description, duration }),
  info: ({ title, description, duration }) =>
    toast.info(title, { description, duration }),
  warning: ({ title, description, duration }) =>
    toast.warning(title, { description, duration })
};

let notificationApi: NotificationApi = defaultNotificationApi;

export const setNotificationApi = (api?: NotificationApi) => {
  notificationApi = api ?? defaultNotificationApi;
};

export const showNotification = (config: NotificationConfig) => {
  // Default duration: success/info 6s, error/warning 8s (longer for important messages)
  const defaultDuration = config.type === 'error' || config.type === 'warning' ? 5000 : 4000;
  const { type, title, description, duration = defaultDuration } = config;
  notificationApi[type]?.({ title, description, duration });
};

// Helper functions cho các loại notification thường dùng
export const notificationUtils = {
  success: (title: string, description?: string) =>
    showNotification({ type: 'success', title, description }),

  error: (title: string, description?: string) =>
    showNotification({ type: 'error', title, description }),

  info: (title: string, description?: string) =>
    showNotification({ type: 'info', title, description }),

  warning: (title: string, description?: string) =>
    showNotification({ type: 'warning', title, description })
};

export { defaultNotificationApi };
