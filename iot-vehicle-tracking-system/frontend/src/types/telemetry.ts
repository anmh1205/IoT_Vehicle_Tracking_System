/**
 * Telemetry Types
 */
import type { DateRange } from './common';

export interface TelemetryData {
  deviceId: string;
  vehicleId: number;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  speed?: number;
  heading?: number;
  engineStatus?: boolean;
  fuelLevel?: number;
  odometer?: number;
  batteryVoltage?: number;
}

export interface TelemetryHistory {
  vehicleId: number;
  data: TelemetryData[];
  dateRange: DateRange;
}

export interface LiveLocation {
  vehicleId: number;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
}

export interface QueryTelemetryDto extends Partial<DateRange> {
  vehicleId?: number;
  deviceId?: string;
  limit?: number;
}

