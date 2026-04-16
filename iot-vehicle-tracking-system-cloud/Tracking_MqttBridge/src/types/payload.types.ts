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

export interface RawDiagnostics {
  channel?: RawDiagnosticsChannel;
  signals?: RawDiagnosticsSignals;
  quality?: RawDiagnosticsQuality;
  events?: RawDiagnosticsEvent[];
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
  metadata?: PayloadMetadata;
}

export interface StatusPayload {
  device_id: string;
  auth_token: string;
  status: 'running' | 'stopped';
  session_id?: number;
  timestamp: number;
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
