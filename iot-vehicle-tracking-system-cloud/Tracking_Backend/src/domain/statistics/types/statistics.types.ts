export interface StatisticsDateRange {
  from: Date;
  to: Date;
}

export type StatisticsInterval = 'day' | 'week' | 'month';

export interface FleetUsagePoint {
  label: string;
  activeVehicles: number;
  inactiveVehicles: number;
}

export interface DeviceUptimeItem {
  deviceId: string;
  uptimePercent: number;
  totalHours: number;
  downHours: number;
}

export interface AlertFrequencyPoint {
  label: string;
  speeding: number;
  geofence: number;
  offline: number;
  other: number;
}

export interface TripSummaryPoint {
  label: string;
  totalTrips: number;
  totalDistanceKm: number;
  avgDurationMinutes: number;
}

export interface StatisticsSummary {
  totalRuntimeHours: number;
  averageUptimePercent: number;
  totalSessions: number;
  totalAlerts: number;
}

export interface PolicyLimitsSummary {
  vehicleId: string;
  quotaLimitKm: number;
  consumedKm: number;
  remainingKm: number;
  quotaState: 'UNDER_LIMIT' | 'NEAR_LIMIT' | 'EXCEEDED';
  cycleStartAt: string | null;
  cycleEndAt: string | null;
  updatedAt: string;
}
