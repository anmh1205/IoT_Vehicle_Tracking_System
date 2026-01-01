/**
 * Maintenance Types
 */
import type { BaseEntity, QueryParams, DateRange } from './common';

export type MaintenanceType = 
  | 'oil_change' 
  | 'tire_rotation' 
  | 'brake_service' 
  | 'inspection' 
  | 'repair' 
  | 'other';

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Maintenance extends BaseEntity {
  vehicleId: number;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description?: string;
  scheduledDate: string;
  completedDate?: string;
  cost?: number;
  odometer?: number;
  notes?: string;
}

export interface CreateMaintenanceDto {
  vehicleId: number;
  type: MaintenanceType;
  description?: string;
  scheduledDate: string;
  cost?: number;
  odometer?: number;
  notes?: string;
}

export interface UpdateMaintenanceDto {
  status?: MaintenanceStatus;
  completedDate?: string;
  cost?: number;
  notes?: string;
}

export interface QueryMaintenanceDto extends QueryParams, Partial<DateRange> {
  vehicleId?: number;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
}

