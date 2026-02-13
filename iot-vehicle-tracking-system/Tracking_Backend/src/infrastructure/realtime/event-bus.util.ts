import { EventEmitter } from 'events';

export interface RealtimeEventMap {
  'device.status.changed': {
    device_id: string;
    status: string;
    last_seen_at?: string;
  };
  'device.position.updated': {
    device_id: string;
    lat: number;
    lon: number;
    speed: number;
    heading: number;
    timestamp: number;
    status?: string;
    deviceName?: string;
    vehiclePlate?: string;
    battery?: number | null;
  };
  'device.session.started': { device_id: string; session_id: number };
  'device.session.ended': { device_id: string; session_id: number };
  'command.acknowledged': {
    device_id: string;
    command_id: string;
    status: string;
  };

  'dashboard.stats.updated': Record<string, unknown>;
  'dashboard.alert.created': {
    id: number;
    vehicle_id?: number;
    device_id?: string;
    alert_type: string;
    severity: string;
    title: string;
    message?: string;
    latitude?: number;
    longitude?: number;
  };
  'dashboard.activity.created': {
    id: number;
    type: string;
    message: string;
    timestamp: string;
  };

  'geofence.entered': {
    deviceId: string;
    geofenceName: string;
    geofenceId: number;
    timestamp: string;
  };
  'geofence.exited': {
    deviceId: string;
    geofenceName: string;
    geofenceId: number;
    timestamp: string;
  };

  'export.completed': {
    id: number;
    user_id: number;
    file_path: string;
    status: string;
  };

  'firmware.assignment.updated': {
    firmware_id: number;
    device_ids: number[];
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
