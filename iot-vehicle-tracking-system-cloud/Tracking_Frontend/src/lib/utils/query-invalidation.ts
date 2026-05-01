import type { QueryClient } from '@tanstack/react-query';

export const queryInvalidation = {
  device: {
    list: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    all: (queryClient: QueryClient, deviceId?: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['devices'] });
      if (deviceId !== undefined) {
        void queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
        void queryClient.invalidateQueries({ queryKey: ['device-detail', deviceId] });
      }
    },
    detail: (queryClient: QueryClient, deviceId: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      void queryClient.invalidateQueries({ queryKey: ['device-detail', deviceId] });
    },
    sessions: (queryClient: QueryClient, deviceId: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['device-sessions', deviceId] });
    },
    errorCodes: (queryClient: QueryClient, deviceId: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['device-errors', deviceId] });
    },
    telemetry: (queryClient: QueryClient, deviceId: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['device-telemetry', deviceId] });
    },
    commands: (queryClient: QueryClient, deviceId?: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['device-commands'] });
      if (deviceId !== undefined) {
        void queryClient.invalidateQueries({ queryKey: ['device-commands', deviceId] });
      }
    },
  },
  dashboard: {
    all: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
    stats: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    activity: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'activity'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
  },
  notifications: {
    all: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  },
  exports: {
    all: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
    detail: (queryClient: QueryClient, id: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['export', id] });
    },
  },
  map: {
    positions: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['device-positions'] });
    },
  },
} as const;
