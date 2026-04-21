import { EventEmitter } from 'events';

interface RealtimeMetadata {
  message_id?: string;
  schema_version?: string;
  seq_no?: number;
  boot_id?: string;
}

export interface RealtimeEventMap {
  'device:status': {
    device_id: string;
    status: string;
    last_seen_at?: string;
    metadata?: RealtimeMetadata;
  };
  'device:position': {
    device_id: string;
    lat: number;
    lon: number;
    speed: number;
    heading: number;
    timestamp: number;
    status?: string;
    deviceName?: string;
    vehicleId?: string | null;
    vehiclePlate?: string;
    battery?: number | null;
    deviceBattery?: number | null;
    vehicleBattery?: number | null;
    temperature?: number | null;
    engineTemperature?: number | null;
    rpm?: number | null;
    metadata?: RealtimeMetadata;
  };
  'device:session_start': {
    device_id: string;
    session_id: number;
    metadata?: RealtimeMetadata;
  };
  'device:session_end': {
    device_id: string;
    session_id: number;
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
    severity: string;
    title: string;
    message?: string;
    latitude?: number;
    longitude?: number;
    metadata?: RealtimeMetadata;
    alertMetadata?: Record<string, unknown>;
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
