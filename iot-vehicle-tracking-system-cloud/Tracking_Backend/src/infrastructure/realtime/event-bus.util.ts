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
    boundaryEvent?: 'started' | 'ended' | 'none';
    boundarySource?: string | null;
    localSessionKey?: number | null;
    canonicalSessionId?: string | null;
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
    localSessionKey?: number | null;
    canonicalSessionId?: string | null;
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
    imuAccelDeltaMps2?: number | null;
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
    boundarySource?: string | null;
    localSessionKey?: number | null;
    canonicalSessionId?: string | null;
    metadata?: RealtimeMetadata;
  };
  'device:session_end': {
    deviceId: string;
    sessionId: number;
    boundarySource?: string | null;
    localSessionKey?: number | null;
    canonicalSessionId?: string | null;
    metadata?: RealtimeMetadata;
  };
  'command:ack': {
    device_id: string;
    command_id: string;
    status: string;
    response?: string | null;
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
  'alert:updated': {
    id: number;
    vehicle_id?: string | null;
    device_id?: string | null;
    status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
    action: 'acknowledge' | 'resolve' | 'dismiss';
    updated_at: string;
  };
  'alert:deleted': {
    id: number;
    vehicle_id?: string | null;
    device_id?: string | null;
    deleted_at: string;
  };
  'violation:new': {
    id: number;
    alert_id?: number | null;
    vehicle_id?: string | null;
    violation_type: string;
    severity: string;
    created_at: string;
  };
  'violation:updated': {
    id: number;
    alert_id?: number | null;
    vehicle_id?: string | null;
    action: 'acknowledge';
    acknowledged: boolean;
    updated_at: string;
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
  'activity:new': {
    id: number;
    type: string;
    message: string;
    timestamp: string;
    vehicle_id?: string | null;
    device_id?: string | null;
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

  'notification:new': {
    id: number;
    type: string;
    title: string;
    message?: string;
    isRead?: boolean;
    referenceId?: number | null;
    referenceType?: string | null;
    vehicleId?: string | null;
    deviceId?: string | null;
    createdAt: string;
  };
  'notification:updated': {
    user_id?: number | null;
    id?: number;
    ids?: number[];
    unreadCount?: number;
    action: 'read' | 'read_all' | 'hidden';
  };

  'export:progress': {
    id: number;
    user_id: number;
    progress: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
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
  'firmware:progress': {
    jobId: string;
    deviceId: string;
    status: string;
    progress?: number | null;
    targetVersion?: string;
    currentVersion?: string;
    partition?: string | null;
    error?: string | null;
    metadata?: RealtimeMetadata;
  };

  'simulator:status': {
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
    preview: Array<Record<string, unknown>>;
  };
  'auth:access-revoked': {
    userId: number;
  };
  'system-admin:settings': {
    key: string;
    action: 'create' | 'update' | 'delete' | 'activate' | 'rollback';
    resource?: string;
    revision?: number;
    actorUserId?: number;
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
