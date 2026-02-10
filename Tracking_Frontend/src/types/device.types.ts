export interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  currentStatus: 'running' | 'stopped' | 'disconnected';
  lastSeenAt: string | null;
  totalRuntimeSeconds: number;
  latitude: number | null;
  longitude: number | null;
  firmwareVersion: string | null;
  lastErrorCode: number;
  createdAt: string;
}

export interface DeviceDetail extends Device {
  imei: string | null;
  vibrationThreshold: number;
  requestInterval: number;
  targetFirmwareVersion: string | null;
  config: Record<string, unknown> | null;
  currentSession: DeviceSession | null;
  recentSessions: DeviceSession[];
}

export interface DeviceSession {
  id: number;
  status: 'running' | 'completed' | 'disconnected';
  serverSessionStart: string | null;
  serverSessionEnd: string | null;
  uptime: number | null;
  avgVibration: number | null;
  dataPointsCount: number;
}

export interface DevicePosition {
  deviceId: string;
  deviceName: string;
  latitude: number;
  longitude: number;
  currentStatus: string;
  lastSeenAt: string | null;
}

export interface CreateDeviceInput {
  deviceId: string;
  deviceName: string;
  imei?: string;
  vibrationThreshold?: number;
  requestInterval?: number;
}

export interface UpdateDeviceInput {
  deviceName?: string;
  imei?: string;
  vibrationThreshold?: number;
  requestInterval?: number;
  targetFirmwareVersion?: string | null;
}

export interface DeviceListQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
