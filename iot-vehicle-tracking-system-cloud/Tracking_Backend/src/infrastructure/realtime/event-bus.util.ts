import { EventEmitter } from 'events';

interface RealtimeMetadata {
  message_id?: string;
  schema_version?: string;
  seq_no?: number;
  boot_id?: string;
}

export interface RealtimeEventMap {
  'device:status': {
    deviceId: string;
    status: string;
    ignitionState?: 'ON' | 'OFF' | 'UNKNOWN' | null;
    motionState?: 'MOVING' | 'STATIONARY' | 'UNKNOWN' | null;
    vehicleState?:
      | 'PARKED_OFF'
      | 'ROLLING_IGN_OFF'
      | 'IDLING_ON'
      | 'MOVING_ON'
      | 'UNKNOWN_STATIONARY'
      | 'UNKNOWN_MOVING'
      | 'UNKNOWN'
      | null;
    deviceState?:
      | 'BOOTING'
      | 'ACTIVE'
      | 'SLEEP_PREPARE'
      | 'SLEEPING'
      | 'WAKING'
      | 'ALARM'
      | 'OTA'
      | 'FAULT'
      | null;
    sleepMode?: 'NONE' | 'FAKE' | 'LIGHT' | 'DEEP' | null;
    stateUpdatedAt?: string | null;
    lastSeenAt?: string;
    metadata?: RealtimeMetadata;
  };
  'device:position': {
    deviceId: string;
    latitude?: number | null;
    longitude?: number | null;
    speed?: number | null;
    course?: number | null;
    timestamp: number;
    status?: string;
    ignitionState?: 'ON' | 'OFF' | 'UNKNOWN' | null;
    motionState?: 'MOVING' | 'STATIONARY' | 'UNKNOWN' | null;
    vehicleState?:
      | 'PARKED_OFF'
      | 'ROLLING_IGN_OFF'
      | 'IDLING_ON'
      | 'MOVING_ON'
      | 'UNKNOWN_STATIONARY'
      | 'UNKNOWN_MOVING'
      | 'UNKNOWN'
      | null;
    deviceState?:
      | 'BOOTING'
      | 'ACTIVE'
      | 'SLEEP_PREPARE'
      | 'SLEEPING'
      | 'WAKING'
      | 'ALARM'
      | 'OTA'
      | 'FAULT'
      | null;
    sleepMode?: 'NONE' | 'FAKE' | 'LIGHT' | 'DEEP' | null;
    stateUpdatedAt?: string | null;
    deviceName?: string;
    vehicleId?: string | null;
    vehiclePlate?: string | null;
    deviceBattery?: number | null;
    vehicleBattery?: number | null;
    satellites?: number | null;
    vibration?: number | null;
    errorCode?: number | null;
    temperature?: number | null;
    engineTemperature?: number | null;
    rpm?: number | null;
    deviceAlerts?: {
      count: number;
      highestSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
      titles: string[];
    };
    ecuAlerts?: {
      count: number;
      highestSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
      titles: string[];
    };
    metadata?: RealtimeMetadata;
  };
  'device:session_start': {
    deviceId: string;
    sessionId: number;
    metadata?: RealtimeMetadata;
  };
  'device:session_end': {
    deviceId: string;
    sessionId: number;
    metadata?: RealtimeMetadata;
  };
  'command:ack': {
    device_id: string;
    command_id: string;
    status: string;
  };

  'stats:update': Record<string, unknown>;
  'alert:new': {
    id: number;
    vehicle_id?: string;
    device_id?: string;
    alert_type: string;
    source?: 'device' | 'ecu';
    severity: string;
    title: string;
    message?: string;
    latitude?: number;
    longitude?: number;
    metadata?: RealtimeMetadata;
    alertMetadata?: Record<string, unknown>;
  };
  'zone:updated': {
    vehicle_id: string;
    zone_id: number | null;
    status: 'active' | 'disabled';
    membership_state?: 'unknown' | 'inside' | 'outside' | 'suspect';
    last_changed_at?: string | null;
  };
  'zone:state-changed': {
    device_id?: string;
    vehicle_id: string;
    zone_id: number;
    previous_membership_state: 'unknown' | 'inside' | 'outside' | 'suspect';
    membership_state: 'unknown' | 'inside' | 'outside' | 'suspect';
    last_changed_at: string;
    latitude?: number;
    longitude?: number;
    metadata?: RealtimeMetadata;
  };
  'geofence:allowed-zone-updated': {
    vehicle_id: string;
    allowed_zone_id: number | null;
    status: 'active' | 'disabled';
    membership_state?: 'unknown' | 'inside' | 'outside' | 'suspect';
    last_changed_at?: string | null;
  };
  'geofence:allowed-zone-state-changed': {
    device_id?: string;
    vehicle_id: string;
    allowed_zone_id: number;
    previous_membership_state: 'unknown' | 'inside' | 'outside' | 'suspect';
    membership_state: 'unknown' | 'inside' | 'outside' | 'suspect';
    last_changed_at: string;
    latitude?: number;
    longitude?: number;
    metadata?: RealtimeMetadata;
  };
  'activity:new': {
    id: number;
    type: string;
    message: string;
    timestamp: string;
  };

  'geofence:enter': {
    deviceId: string;
    geofenceName: string;
    geofenceId: number;
    timestamp: string;
  };
  'geofence:exit': {
    deviceId: string;
    geofenceName: string;
    geofenceId: number;
    timestamp: string;
  };

  'export:ready': {
    id: number;
    user_id: number;
    file_path: string;
    status: string;
  };

  'firmware:assignment': {
    firmware_id: number;
    device_ids: string[];
    status: string;
  };
}

type EventKey = keyof RealtimeEventMap;

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export const publishEvent = <K extends EventKey>(
  event: K,
  payload: RealtimeEventMap[K],
): void => {
  emitter.emit(event, payload);
};

export const subscribeEvent = <K extends EventKey>(
  event: K,
  handler: (payload: RealtimeEventMap[K]) => void,
): void => {
  emitter.on(event, handler);
};

export const onceEvent = <K extends EventKey>(
  event: K,
  handler: (payload: RealtimeEventMap[K]) => void,
): void => {
  emitter.once(event, handler);
};

export const removeAllEventListeners = (event?: EventKey): void => {
  if (event) {
    emitter.removeAllListeners(event);
  } else {
    emitter.removeAllListeners();
  }
};
