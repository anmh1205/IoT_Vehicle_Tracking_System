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
  status: 'downloading' | 'installing' | 'success' | 'failed';
  progress?: number;
  targetVersion: string;
  error?: string;
}
