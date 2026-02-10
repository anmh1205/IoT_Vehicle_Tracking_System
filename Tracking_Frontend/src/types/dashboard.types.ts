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
