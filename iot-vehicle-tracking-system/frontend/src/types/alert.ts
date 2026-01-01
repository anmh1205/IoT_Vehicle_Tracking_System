/**
 * Alert Types
 */
import type { BaseEntity, QueryParams, DateRange } from './common';

export type AlertType = 
  | 'speeding' 
  | 'geofence_enter' 
  | 'geofence_exit' 
  | 'harsh_braking' 
  | 'harsh_acceleration'
  | 'idle'
  | 'low_battery'
  | 'device_offline';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'new' | 'acknowledged' | 'resolved';

export interface Alert extends BaseEntity {
  vehicleId: number;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  acknowledgedAt?: string;
  acknowledgedBy?: number;
  resolvedAt?: string;
  resolvedBy?: number;
}

export interface AcknowledgeAlertDto {
  notes?: string;
}

export interface ResolveAlertDto {
  resolution: string;
}

export interface QueryAlertDto extends QueryParams, Partial<DateRange> {
  vehicleId?: number;
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
}

