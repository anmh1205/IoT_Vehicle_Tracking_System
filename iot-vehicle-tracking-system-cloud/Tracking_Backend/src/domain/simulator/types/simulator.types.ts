export interface SimulatorStartInput {
  deviceIds: string[];
  intervalSec: number;
  durationMin: number;
  speedMin: number;
  speedMax: number;
  imuAccelDeltaMinMps2: number;
  imuAccelDeltaMaxMps2: number;
  batteryMin: number;
  batteryMax: number;
  lat: number;
  lon: number;
}

export interface SimulatorPoint {
  deviceId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  imuAccelDeltaMps2: number;
  vehicleBattery: number;
  deviceBattery: number;
  errorCode: number | null;
}

export interface SimulatorStatus {
  running: boolean;
  paused: boolean;
  jobId: string | null;
  startedBy: number | null;
  startedAt: string | null;
  stoppedAt: string | null;
  expiresAt: string | null;
  lastTickAt: string | null;
  intervalSec: number | null;
  durationMin: number | null;
  ticks: number;
  sentPoints: number;
  deviceIds: string[];
  reason: string | null;
  preview: SimulatorPoint[];
}
