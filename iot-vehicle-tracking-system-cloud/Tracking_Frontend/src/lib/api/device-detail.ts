import { apiClient, unwrap } from './client';
import { deviceServices } from './devices';

export interface DeviceRuntimeStats {
  totalRuntime: number;
  totalSessions: number;
  avgSessionDuration: number;
  avgImuAccelDeltaMps2: number;
  totalDataPoints: number;
  lastSession: Record<string, unknown> | null;
}

export interface DeviceDetailAggregate {
  device: Record<string, unknown> | null;
  runtime: DeviceRuntimeStats | null;
  sessions: unknown[];
  commands: unknown[];
  errors: unknown[];
}

const getListItems = (payload: any): unknown[] => {
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }
  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  return [];
};

const parseRuntimeStats = (payload: any): DeviceRuntimeStats | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return {
    totalRuntime: Number(payload.totalRuntime ?? payload.total_runtime ?? 0),
    totalSessions: Number(payload.totalSessions ?? payload.total_sessions ?? 0),
    avgSessionDuration: Number(payload.avgSessionDuration ?? payload.avg_session_duration ?? 0),
    avgImuAccelDeltaMps2: Number(
      payload.avgImuAccelDeltaMps2 ??
      payload.avg_imu_accel_delta_mps2 ??
      payload.avgVibration ??
      payload.avg_vibration ??
      0,
    ),
    totalDataPoints: Number(payload.totalDataPoints ?? payload.total_data_points ?? 0),
    lastSession: payload.lastSession ?? payload.last_session ?? null,
  };
};

export const deviceDetailServices = {
  getById: (id: number | string) => deviceServices.getById(id),

  getRuntime: (id: number | string) =>
    apiClient
      .get(`/devices/${id}/runtime`)
      .then((response) => parseRuntimeStats(unwrap<any>(response.data))),

  getSessions: (id: number | string, params?: { page?: number; limit?: number }) =>
    deviceServices.getSessions(id, params),

  getCommands: (id: number | string, params?: { page?: number; limit?: number }) =>
    deviceServices.getCommands(id, params),

  getErrors: (id: number | string, params?: { page?: number; limit?: number }) =>
    deviceServices.getErrors(id, params),

  getTelemetry: (id: number | string, params?: { metric?: string; from?: string; to?: string }) =>
    deviceServices.getTelemetry(id, params),

  updateSettings: (id: number, data: Record<string, unknown>) => deviceServices.update(id, data),

  getAggregate: async (id: number | string): Promise<DeviceDetailAggregate> => {
    const [device, runtime, sessions, commands, errors] = await Promise.all([
      deviceServices.getById(id).catch(() => null),
      apiClient
        .get(`/devices/${id}/runtime`)
        .then((response) => parseRuntimeStats(unwrap<any>(response.data)))
        .catch(() => null),
      deviceServices.getSessions(id, { limit: 20 }).catch(() => null),
      deviceServices.getCommands(id, { limit: 20 }).catch(() => null),
      deviceServices.getErrors(id, { limit: 20 }).catch(() => null),
    ]);

    return {
      device,
      runtime,
      sessions: getListItems(sessions),
      commands: getListItems(commands),
      errors: getListItems(errors),
    };
  },
};
