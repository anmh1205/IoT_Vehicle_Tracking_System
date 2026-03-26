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
}

export interface StatusPayload {
  device_id: string;
  status: 'running' | 'stopped';
  session_id?: number;
  timestamp: number;
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
}
