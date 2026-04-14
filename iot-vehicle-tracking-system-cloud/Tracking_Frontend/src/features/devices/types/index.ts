export interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  currentStatus: 'running' | 'stopped' | 'disconnected' | 'online';
  imei: string | null;
  firmwareVersion: string | null;
  vehiclePlate?: string | null;
  customerName?: string | null;
  lastSeenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  totalRuntimeSeconds?: number;
  requestInterval?: number;
  vibrationThreshold?: number;
  config?: Record<string, unknown> | null;
}

export interface DeviceSession {
  id: number;
  status: 'running' | 'completed' | 'disconnected' | string;
  serverSessionStart: string | null;
  serverSessionEnd: string | null;
  uptime: number | null;
  avgVibration: number | null;
  dataPointsCount: number;
}

export interface DeviceErrorCode {
  id: number;
  errorCode: number;
  errorName: string;
  description: string;
  occurredAt: string;
  resolvedAt: string | null;
}

export interface DeviceRuntimeBucket {
  label: string;
  runtimeSeconds: number;
}

export interface DeviceVibrationPoint {
  timestamp: string;
  value: number;
}
