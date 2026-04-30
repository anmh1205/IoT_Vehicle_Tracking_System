export type IgnitionState = 'ON' | 'OFF' | 'UNKNOWN';
export type MotionState = 'MOVING' | 'STATIONARY' | 'UNKNOWN';
export type VehicleState =
  | 'PARKED_OFF'
  | 'ROLLING_IGN_OFF'
  | 'IDLING_ON'
  | 'MOVING_ON'
  | 'UNKNOWN_STATIONARY'
  | 'UNKNOWN_MOVING'
  | 'UNKNOWN';
export type DeviceRuntimeState =
  | 'BOOTING'
  | 'ACTIVE'
  | 'SLEEP_PREPARE'
  | 'SLEEPING'
  | 'WAKING'
  | 'ALARM'
  | 'OTA'
  | 'FAULT';
export type SleepMode = 'NONE' | 'FAKE' | 'LIGHT' | 'DEEP';
export type AlertSource = 'device' | 'ecu';
export type AlertSeverityLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface DeviceAlertSummary {
  source: AlertSource;
  count: number;
  highestSeverity: AlertSeverityLevel;
  titles: string[];
}

export interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  currentStatus: 'running' | 'stopped' | 'disconnected' | 'online';
  ignitionState: IgnitionState | null;
  motionState: MotionState | null;
  vehicleState: VehicleState | null;
  deviceState: DeviceRuntimeState | null;
  sleepMode: SleepMode | null;
  stateUpdatedAt?: string | null;
  deviceAlerts: DeviceAlertSummary;
  ecuAlerts: DeviceAlertSummary;
  imei: string | null;
  firmwareVersion: string | null;
  targetFirmwareVersion?: string | null;
  vehicleId?: string | null;
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

export type DeviceTrackingMetric =
  | 'latitude'
  | 'longitude'
  | 'speed'
  | 'deviceBattery'
  | 'vehicleBattery'
  | 'temperature'
  | 'errorCode'
  | 'vibration';

export interface DeviceTelemetryPoint {
  timestamp: string;
  value: number;
}

export interface DeviceTelemetryRow {
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
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
  ignitionState: IgnitionState | null;
  motionState: MotionState | null;
  vehicleState: VehicleState | null;
  deviceState: DeviceRuntimeState | null;
  sleepMode: SleepMode | null;
  stateUpdatedAt: string | null;
  timestamp: string | null;
  deviceBattery: number | null;
  vehicleBattery: number | null;
  vibration: number | null;
  errorCode: number | null;
  temperature: number | null;
  engineTemperature: number | null;
  rpm: number | null;
  activeAlertCount: number;
  activeAlertTitles: string[];
  deviceAlerts: DeviceAlertSummary;
  ecuAlerts: DeviceAlertSummary;
}

export interface DeviceRawFeedRow {
  id: string;
  timestamp: string | null;
  source: 'telemetry' | 'session' | 'error' | 'command' | 'event-log' | 'obd-diagnostic';
  event: string;
  summary: string;
  payload: Record<string, unknown>;
}
