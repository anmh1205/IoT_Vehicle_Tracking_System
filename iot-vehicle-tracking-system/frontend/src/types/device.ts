/**
 * Device Types - CORRECTED based on REVIEW_CORRECTIONS.md
 */
import type { BaseEntity, QueryParams } from './common';

// Backend status enum (not 'online', 'maintenance')
export type DeviceStatus = 'active' | 'inactive' | 'offline' | 'error';

export interface Device extends BaseEntity {
  deviceId: string;
  vehicleId?: number;
  deviceType?: string;      // Backend has this (default: 'tracker')
  firmwareVersion?: string;
  hardwareVersion?: string; // Backend has this
  imei?: string;            // Backend has this (unique)
  simCardNumber?: string;   // Backend has this
  status: DeviceStatus;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
  // NOTE: serialNumber does NOT exist in backend
}

export interface CreateDeviceDto {
  deviceId: string;
  vehicleId?: number;
  deviceType?: string;      // Optional, default: 'tracker'
  firmwareVersion?: string;
  hardwareVersion?: string;
  imei?: string;
  simCardNumber?: string;
  status?: DeviceStatus;    // Optional, default: 'active'
}

export interface UpdateDeviceDto {
  firmwareVersion?: string;
  hardwareVersion?: string;
  imei?: string;
  simCardNumber?: string;
  status?: DeviceStatus;
  vehicleId?: number;
}

export interface QueryDeviceDto extends QueryParams {
  status?: DeviceStatus;
  vehicleId?: number;
}

export interface AssignDeviceDto {
  vehicleId: number;
}

