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
  device_id: string;
  device_name: string;
  auth_token: string;
  last_seen_at: Date | null;
  current_status: 'running' | 'stopped' | 'disconnected' | 'online';
  ignition_state: IgnitionState | null;
  motion_state: MotionState | null;
  vehicle_state: VehicleState | null;
  device_state: DeviceRuntimeState | null;
  sleep_mode: SleepMode | null;
  state_updated_at: Date | null;
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
  vehicle_plate?: string | null;
  customer_name?: string | null;
  linked_vehicle_id?: string | null;
  device_alert_count?: number | null;
  device_alert_titles?: string[] | null;
  device_alert_highest_severity?: AlertSeverityLevel | null;
  ecu_alert_count?: number | null;
  ecu_alert_titles?: string[] | null;
  ecu_alert_highest_severity?: AlertSeverityLevel | null;
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
  avg_vehicle_battery: number | null;
  avg_device_battery: number | null;
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
  currentStatus: 'running' | 'stopped' | 'disconnected' | 'online';
  ignitionState: IgnitionState | null;
  motionState: MotionState | null;
  vehicleState: VehicleState | null;
  deviceState: DeviceRuntimeState | null;
  sleepMode: SleepMode | null;
  stateUpdatedAt: string | null;
  deviceAlerts: DeviceAlertSummary;
  ecuAlerts: DeviceAlertSummary;
  lastSeenAt: string | null;
  totalRuntimeSeconds: number;
  latitude: number | null;
  longitude: number | null;
  firmwareVersion: string | null;
  lastErrorCode: number;
  createdAt: string;
  vehiclePlate?: string | null;
  customerName?: string | null;
  vehicleId?: string | null;
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
  vehicleId?: string | null;
  vehiclePlate?: string | null;
  customerName?: string | null;
  latitude: number;
  longitude: number;
  currentStatus: string;
  ignitionState: IgnitionState | null;
  motionState: MotionState | null;
  vehicleState: VehicleState | null;
  deviceState: DeviceRuntimeState | null;
  sleepMode: SleepMode | null;
  stateUpdatedAt: string | null;
  lastSeenAt: string | null;
  speed?: number | null;
  course?: number | null;
  deviceBattery?: number | null;
  vehicleBattery?: number | null;
  satellites?: number | null;
  vibration?: number | null;
  errorCode?: number | null;
  temperature?: number | null;
  engineTemperature?: number | null;
  rpm?: number | null;
  activeAlertCount?: number;
  activeAlertTitles?: string[];
  deviceAlerts: DeviceAlertSummary;
  ecuAlerts: DeviceAlertSummary;
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
