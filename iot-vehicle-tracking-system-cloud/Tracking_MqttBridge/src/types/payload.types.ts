import type {
  IgnitionState,
  MotionState,
  VehicleState,
  DeviceRuntimeState,
  SleepMode,
  RuntimeAlertPayload,
} from './device-state.types';

export interface PayloadMetadata {
  schema_version: string;
  message_id: string;
  sent_at: number;
  seq_no?: number;
  boot_id?: string;
}

export interface RawDiagnosticsChannel {
  ble_obd_connected?: boolean;
  elm_ready?: boolean;
  ecu_state?: string;
  poll_interval_ms?: number;
  connect_fail_count_5m?: number;
}

export interface RawDiagnosticsSignals {
  rpm?: number;
  obd_speed_kph?: number;
  coolant_c?: number;
  fuel_level_pct?: number;
  engine_load_pct?: number;
}

export interface RawDiagnosticsQuality {
  sample_age_ms?: number;
  missing_signals?: string[];
}

export interface RawDiagnosticsEvent {
  code?: string;
  count_5m?: number;
}

export type DiagnosticMonitorStatus = 'complete' | 'incomplete' | 'unsupported';

export interface RawDiagnosticsReadiness {
  misfire?: DiagnosticMonitorStatus;
  fuel_system?: DiagnosticMonitorStatus;
  comprehensive_components?: DiagnosticMonitorStatus;
  catalyst?: DiagnosticMonitorStatus;
  heated_catalyst?: DiagnosticMonitorStatus;
  evaporative_system?: DiagnosticMonitorStatus;
  secondary_air_system?: DiagnosticMonitorStatus;
  ac_refrigerant?: DiagnosticMonitorStatus;
  oxygen_sensor?: DiagnosticMonitorStatus;
  oxygen_sensor_heater?: DiagnosticMonitorStatus;
  egr_vvt_system?: DiagnosticMonitorStatus;
  nmhc_catalyst?: DiagnosticMonitorStatus;
  nox_aftertreatment?: DiagnosticMonitorStatus;
  boost_pressure?: DiagnosticMonitorStatus;
  exhaust_gas_sensor?: DiagnosticMonitorStatus;
  pm_filter?: DiagnosticMonitorStatus;
}

export interface RawDiagnosticsDtc {
  stored?: string[];
  pending?: string[];
  permanent?: string[];
}

export interface RawDiagnostics {
  channel?: RawDiagnosticsChannel;
  signals?: RawDiagnosticsSignals;
  quality?: RawDiagnosticsQuality;
  events?: RawDiagnosticsEvent[];
  mil_on?: boolean;
  reported_dtc_count?: number;
  readiness?: RawDiagnosticsReadiness;
  dtc?: RawDiagnosticsDtc;
}

export interface RawDataPayload {
  device_id: string;
  auth_token: string;
  timestamp: number;
  uptime?: number;
  data: {
    vibration?: number;
    battery_top?: number;
    battery_bot?: number;
    latitude?: number;
    longitude?: number;
    speed?: number;
    course?: number;
    satellites?: number;
    ignition?: boolean;
    error_code?: number;
  };
  diagnostics?: RawDiagnostics;
  state?: {
    ignition_state?: IgnitionState;
    motion_state?: MotionState;
    vehicle_state?: VehicleState;
    device_state?: DeviceRuntimeState;
    sleep_mode?: SleepMode;
  };
  device_alerts?: RuntimeAlertPayload[];
  ecu_alerts?: RuntimeAlertPayload[];
  metadata?: PayloadMetadata;
}

export interface StatusPayload {
  device_id: string;
  auth_token: string;
  status: 'running' | 'stopped' | 'heartbeat';
  session_id?: number;
  timestamp: number;
  state?: {
    ignition_state?: IgnitionState;
    motion_state?: MotionState;
    vehicle_state?: VehicleState;
    device_state?: DeviceRuntimeState;
    sleep_mode?: SleepMode;
  };
  device_alerts?: RuntimeAlertPayload[];
  ecu_alerts?: RuntimeAlertPayload[];
  metadata?: PayloadMetadata;
}

export interface EventPayload {
  device_id: string;
  auth_token: string;
  event_type: 'error' | 'warning' | 'info';
  code?: number;
  message?: string;
  timestamp: number;
  metadata?: PayloadMetadata;
}

export interface FirmwareStatusPayload {
  device_id: string;
  auth_token: string;
  jobId: string;
  status:
    | 'assigned'
    | 'downloading'
    | 'verifying'
    | 'installing'
    | 'rebooting'
    | 'confirming'
    | 'success'
    | 'failed'
    | 'rolled_back';
  progress?: number;
  targetVersion: string;
  currentVersion: string;
  partition?: string;
  error?: string;
  metadata?: PayloadMetadata;
}
