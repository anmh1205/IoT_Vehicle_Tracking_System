export interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  currentStatus: 'running' | 'stopped' | 'disconnected' | 'online';
  imei: string | null;
  firmwareVersion: string | null;
  targetFirmwareVersion?: string | null;
  vehiclePlate?: string | null;
  customerName?: string | null;
  lastSeenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  totalRuntimeSeconds?: number;
  requestInterval?: number;
  vibrationThreshold?: number;
  lastErrorCode?: number | null;
  config?: Record<string, unknown> | null;
  currentSession?: DeviceSession | null;
  recentSessions?: DeviceSession[];
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

export interface DeviceCommand {
  id: number;
  deviceId: string;
  command: string;
  params: Record<string, unknown>;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed' | string;
  sentAt: string | null;
  ackedAt: string | null;
  response: string | null;
}

export type DeviceTrackingMetric = 'lat' | 'lon' | 'spd' | 'bb' | 'bt' | 'temp' | 'err' | 'vib';

export interface DeviceTelemetryPoint {
  timestamp: string;
  value: number;
}

export interface DeviceTelemetryRow {
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  battery: number | null;
  deviceBattery: number | null;
  vehicleBattery: number | null;
  temperature: number | null;
  engineTemperature: number | null;
  errorCode: number | null;
  vibration: number | null;
}

export interface DevicePositionSnapshot {
  deviceId: string;
  deviceName: string;
  vehiclePlate?: string | null;
  customerName?: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  heading: number | null;
  status: string;
  timestamp: string | null;
  battery: number | null;
  deviceBattery: number | null;
  vehicleBattery: number | null;
  vibration: number | null;
  temperature: number | null;
  engineTemperature: number | null;
  rpm: number | null;
  activeAlertCount: number;
  activeAlertTitles: string[];
}

export interface DeviceRawFeedRow {
  id: string;
  timestamp: string | null;
  source: 'telemetry' | 'session' | 'error' | 'command' | 'event-log' | 'obd-diagnostic';
  event: string;
  summary: string;
  payload: Record<string, unknown>;
}
