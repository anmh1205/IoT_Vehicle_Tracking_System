export type LegacyRuntimeStatus =
  | 'running'
  | 'stopped'
  | 'heartbeat'
  | 'online'
  | 'offline'
  | 'disconnected';

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
export type AlertSeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RuntimeAlertPayload {
  code: string;
  severity: AlertSeverityLevel;
  message?: string;
}

export interface RuntimeStatePayload {
  ignition_state?: IgnitionState;
  motion_state?: MotionState;
  vehicle_state?: VehicleState;
  device_state?: DeviceRuntimeState;
  sleep_mode?: SleepMode;
}

export interface RuntimeStateSnapshot {
  ignition_state: IgnitionState;
  motion_state: MotionState;
  vehicle_state: VehicleState;
  device_state: DeviceRuntimeState;
  sleep_mode: SleepMode;
}

interface NormalizeRuntimeStateInput {
  state?: RuntimeStatePayload | null;
  legacyStatus?: string | null;
  ignitionHint?: boolean | null;
  speedKph?: number | null;
  previous?: Partial<RuntimeStateSnapshot> | null;
}

const MOVING_SPEED_THRESHOLD_KPH = 3;

const isIgnitionState = (value: unknown): value is IgnitionState =>
  value === 'ON' || value === 'OFF' || value === 'UNKNOWN';

const isMotionState = (value: unknown): value is MotionState =>
  value === 'MOVING' || value === 'STATIONARY' || value === 'UNKNOWN';

const isVehicleState = (value: unknown): value is VehicleState =>
  value === 'PARKED_OFF' ||
  value === 'ROLLING_IGN_OFF' ||
  value === 'IDLING_ON' ||
  value === 'MOVING_ON' ||
  value === 'UNKNOWN_STATIONARY' ||
  value === 'UNKNOWN_MOVING' ||
  value === 'UNKNOWN';

const isDeviceRuntimeState = (value: unknown): value is DeviceRuntimeState =>
  value === 'BOOTING' ||
  value === 'ACTIVE' ||
  value === 'SLEEP_PREPARE' ||
  value === 'SLEEPING' ||
  value === 'WAKING' ||
  value === 'ALARM' ||
  value === 'OTA' ||
  value === 'FAULT';

const isSleepMode = (value: unknown): value is SleepMode =>
  value === 'NONE' || value === 'FAKE' || value === 'LIGHT' || value === 'DEEP';

export const deriveVehicleState = (
  ignitionState: IgnitionState,
  motionState: MotionState,
): VehicleState => {
  if (ignitionState === 'ON' && motionState === 'MOVING') return 'MOVING_ON';
  if (ignitionState === 'ON' && motionState === 'STATIONARY') return 'IDLING_ON';
  if (ignitionState === 'OFF' && motionState === 'MOVING') return 'ROLLING_IGN_OFF';
  if (ignitionState === 'OFF' && motionState === 'STATIONARY') return 'PARKED_OFF';
  if (ignitionState === 'UNKNOWN' && motionState === 'MOVING') return 'UNKNOWN_MOVING';
  if (ignitionState === 'UNKNOWN' && motionState === 'STATIONARY') return 'UNKNOWN_STATIONARY';
  return 'UNKNOWN';
};

export const normalizeRuntimeState = ({
  state,
  legacyStatus,
  ignitionHint,
  speedKph,
  previous,
}: NormalizeRuntimeStateInput): RuntimeStateSnapshot => {
  const normalizedStatus = String(legacyStatus ?? '').toLowerCase() as LegacyRuntimeStatus | '';
  const speed = speedKph == null ? Number.NaN : Number(speedKph);
  const hasSpeed = Number.isFinite(speed) && speed >= 0;

  const ignitionState =
    (isIgnitionState(state?.ignition_state) && state?.ignition_state) ||
    (typeof ignitionHint === 'boolean' ? (ignitionHint ? 'ON' : 'OFF') : undefined) ||
    (normalizedStatus === 'running' ? 'ON' : undefined) ||
    (isIgnitionState(previous?.ignition_state) ? previous.ignition_state : undefined) ||
    'UNKNOWN';

  const motionState =
    (isMotionState(state?.motion_state) && state?.motion_state) ||
    (hasSpeed ? (speed > MOVING_SPEED_THRESHOLD_KPH ? 'MOVING' : 'STATIONARY') : undefined) ||
    (normalizedStatus === 'heartbeat' ? 'STATIONARY' : undefined) ||
    (isMotionState(previous?.motion_state) ? previous.motion_state : undefined) ||
    'UNKNOWN';

  const vehicleState =
    (isVehicleState(state?.vehicle_state) && state?.vehicle_state) ||
    deriveVehicleState(ignitionState, motionState);

  const deviceState =
    (isDeviceRuntimeState(state?.device_state) && state?.device_state) ||
    ((normalizedStatus === 'offline' || normalizedStatus === 'disconnected') ? 'FAULT' : undefined) ||
    ((normalizedStatus === 'running' ||
      normalizedStatus === 'stopped' ||
      normalizedStatus === 'heartbeat' ||
      normalizedStatus === 'online')
      ? 'ACTIVE'
      : undefined) ||
    (isDeviceRuntimeState(previous?.device_state) ? previous.device_state : undefined) ||
    'ACTIVE';

  const sleepMode =
    (isSleepMode(state?.sleep_mode) && state?.sleep_mode) ||
    (isSleepMode(previous?.sleep_mode) ? previous.sleep_mode : undefined) ||
    'NONE';

  return {
    ignition_state: ignitionState,
    motion_state: motionState,
    vehicle_state: vehicleState,
    device_state: deviceState,
    sleep_mode: sleepMode,
  };
};
