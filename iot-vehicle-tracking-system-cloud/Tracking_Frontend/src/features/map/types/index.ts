export type DeviceMapStatus = 'running' | 'stopped' | 'error' | 'disconnected' | 'online';
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
export type AlertSeverityLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface DeviceAlertSummary {
  source: 'device' | 'ecu';
  count: number;
  highestSeverity: AlertSeverityLevel;
  titles: string[];
}

export interface DevicePosition {
  deviceId: string;
  deviceName: string;
  vehicleId?: string | null;
  vehiclePlate: string | null;
  customerName?: string | null;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  status: DeviceMapStatus;
  ignitionState: IgnitionState | null;
  motionState: MotionState | null;
  vehicleState: VehicleState | null;
  deviceState: DeviceRuntimeState | null;
  sleepMode: SleepMode | null;
  stateUpdatedAt: string | null;
  timestamp: number | null;
  battery?: number | null;
  deviceBattery?: number | null;
  vehicleBattery?: number | null;
  vibration?: number | null;
  temperature?: number | null;
  engineTemperature?: number | null;
  rpm?: number | null;
  activeAlertCount?: number;
  activeAlertTitles?: string[];
  deviceAlerts: DeviceAlertSummary;
  ecuAlerts: DeviceAlertSummary;
}

export type MapLayer = 'street' | 'satellite';
export type MapInspectPanelTarget =
  | 'overview'
  | 'vehicle'
  | 'alerts'
  | 'errors'
  | 'runtime'
  | 'route'
  | 'commands'
  | 'raw'
  | 'settings'
  | 'geofence'
  | 'allowed-zone';
export type MapInspectPanelLinkedEntity = 'device' | 'vehicle' | 'alert' | 'geofence' | 'allowed-zone';

export interface MapInspectPanelPayload {
  highlight?: string | null;
  linkedEntityType?: MapInspectPanelLinkedEntity | null;
  linkedEntityId?: number | null;
  linkedEntityKey?: string | null;
}

export type MapHardMode =
  | 'browse'
  | 'inspect-device'
  | 'edit-geofence'
  | 'edit-allowed-zone'
  | 'mobile-list';
export type MapShareableHardMode = Exclude<MapHardMode, 'mobile-list'>;

export interface MapViewport {
  center: [number, number];
  zoom: number;
}
