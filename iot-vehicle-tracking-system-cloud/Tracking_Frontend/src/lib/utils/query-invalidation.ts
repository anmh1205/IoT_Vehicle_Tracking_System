import type { QueryClient } from '@tanstack/react-query';

export const queryInvalidation = {
  device: {
    list: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    all: (queryClient: QueryClient, deviceId?: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['devices'] });
      void queryClient.invalidateQueries({ queryKey: ['device-positions'] });
      if (deviceId !== undefined) {
        void queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
        void queryClient.invalidateQueries({ queryKey: ['device-detail', deviceId] });
        void queryClient.invalidateQueries({ queryKey: ['device-sessions', deviceId] });
        void queryClient.invalidateQueries({ queryKey: ['device-runtime-chart', deviceId] });
        void queryClient.invalidateQueries({ queryKey: ['device-imu-accel-delta-chart', deviceId] });
        void queryClient.invalidateQueries({ queryKey: ['device-tracking-telemetry', deviceId] });
        void queryClient.invalidateQueries({ queryKey: ['device-position-snapshot', deviceId] });
      }
    },
    detail: (queryClient: QueryClient, deviceId: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      void queryClient.invalidateQueries({ queryKey: ['device-detail', deviceId] });
    },
    sessions: (queryClient: QueryClient, deviceId: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['device-sessions', deviceId] });
      void queryClient.invalidateQueries({ queryKey: ['device-runtime-chart', deviceId] });
    },
    errorCodes: (queryClient: QueryClient, deviceId: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['device-errors', deviceId] });
    },
    telemetry: (queryClient: QueryClient, deviceId: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['device-telemetry', deviceId] });
      void queryClient.invalidateQueries({ queryKey: ['device-tracking-telemetry', deviceId] });
      void queryClient.invalidateQueries({ queryKey: ['device-position-snapshot', deviceId] });
      void queryClient.invalidateQueries({ queryKey: ['device-positions'] });
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
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-alerts'] });
    },
    stats: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'device-status'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'device-activity'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'fleet-runtime'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'activity'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
    activity: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'activity'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] });
    },
  },
  alerts: {
    all: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      void queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0] ?? '').startsWith('alerts-summary') });
      void queryClient.invalidateQueries({ queryKey: ['device-obd-alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-alerts'] });
    },
    list: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    deviceScoped: (queryClient: QueryClient, deviceId: number | string) => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['device-obd-alerts', String(deviceId)] });
      void queryClient.invalidateQueries({ queryKey: ['device-obd-alerts'] });
    },
    summary: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0] ?? '').startsWith('alerts-summary') });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-alerts'] });
    },
  },
  notifications: {
    all: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
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
    roomIds: (queryClient: QueryClient) => {
      void queryClient.invalidateQueries({ queryKey: ['map-device-room-ids'] });
    },
  },
} as const;
