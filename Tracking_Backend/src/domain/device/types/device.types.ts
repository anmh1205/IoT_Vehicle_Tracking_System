export interface Device {
  id: number;
  device_id: string;
  device_name: string;
  auth_token: string;
  last_seen_at: Date | null;
  current_status: 'running' | 'stopped' | 'disconnected';
  total_runtime_seconds: number;
  imei: string | null;
  vibration_threshold: number;
  request_interval: number;
  firmware_version: string | null;
  target_firmware_version: string | null;
  latitude: number | null;
  longitude: number | null;
  config: Record<string, unknown> | null;
  last_error_code: number;
  created_at: Date;
  updated_at: Date;
}

export interface DeviceSession {
  id: number;
  device_id: string;
  status: 'running' | 'completed' | 'disconnected';
  server_session_start: Date | null;
  server_session_end: Date | null;
  session_start: Date | null;
  session_end: Date | null;
  uptime: number | null;
  avg_vibration: number | null;
  min_vibration: number | null;
  max_vibration: number | null;
  avg_battery_top: number | null;
  avg_battery_bot: number | null;
  data_points_count: number;
  last_update: Date | null;
  start_correlation_id: string | null;
  end_correlation_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DevicePublic {
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

export interface DeviceDetail extends DevicePublic {
  imei: string | null;
  vibrationThreshold: number;
  requestInterval: number;
  targetFirmwareVersion: string | null;
  config: Record<string, unknown> | null;
  currentSession: DeviceSessionPublic | null;
  recentSessions: DeviceSessionPublic[];
}

export interface DeviceSessionPublic {
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
  config?: Record<string, unknown>;
}

export interface UpdateDeviceInput {
  deviceName?: string;
  imei?: string | null;
  vibrationThreshold?: number;
  requestInterval?: number;
  targetFirmwareVersion?: string | null;
  config?: Record<string, unknown> | null;
}

export interface DeviceListQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RuntimeStats {
  totalRuntime: number;
  totalSessions: number;
  avgSessionDuration: number;
  avgVibration: number;
  totalDataPoints: number;
  lastSession: DeviceSessionPublic | null;
}
