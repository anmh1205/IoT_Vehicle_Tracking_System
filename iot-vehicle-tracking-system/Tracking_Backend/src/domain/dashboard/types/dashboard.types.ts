export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  stoppedDevices: number;
  offlineDevices: number;
  totalRuntimeToday: number;
  totalRuntimeWeek: number;
  alertsCount: number;
  sessionsToday: number;
}

export interface ActivityEvent {
  id: number;
  correlationId: string;
  deviceId: string;
  eventType: string;
  eventCode: string | null;
  severity: string;
  message: string | null;
  serverTimestamp: string;
}

export interface ActivityQuery {
  page?: number;
  limit?: number;
  deviceId?: string;
  eventType?: string;
  severity?: string;
}

export interface DashboardDeviceActivityPoint {
  label: string;
  running: number;
  idle: number;
  offline: number;
}

export interface DashboardDeviceStatusPoint {
  name: string;
  value: number;
  color?: string;
}

export interface DashboardFleetRuntimePoint {
  label: string;
  runtime: number;
}
