import { apiClient, unwrap } from './client';

export type VehicleAllowedZoneCenterSource = 'vehicle_position' | 'map_pick';
export type VehicleAllowedZoneMembershipState = 'unknown' | 'inside' | 'outside' | 'suspect';
export type VehicleAllowedZoneAlertMode =
  | 'transition_only'
  | 'transition_and_recovery'
  | 'periodic_while_outside'
  | 'silent';

export interface VehicleAllowedZoneWarning {
  code: string;
  message: string;
  staleAgeSec: number | null;
  snapshotAt: string | null;
}

export interface VehicleAllowedZone {
  id: number;
  vehicleId: string;
  zoneType: 'circle';
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  centerSource: VehicleAllowedZoneCenterSource;
  centerSnapshotAt: string | null;
  status: 'active' | 'disabled';
  membershipState: VehicleAllowedZoneMembershipState;
  lastMembershipChangedAt: string | null;
  lastAlertedState: VehicleAllowedZoneMembershipState | null;
  lastAlertedAt: string | null;
  suppressionUntil: string | null;
  alertMode: VehicleAllowedZoneAlertMode;
  cooldownSec: number;
  warning: VehicleAllowedZoneWarning | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleAllowedZonePreviewCenter {
  vehicleId: string;
  plateNumber: string | null;
  deviceId: string | null;
  centerLatitude: number;
  centerLongitude: number;
  centerSource: 'vehicle_position';
  snapshotAt: string | null;
  isStale: boolean;
  staleAgeSec: number | null;
  warning: VehicleAllowedZoneWarning | null;
}

export interface UpsertVehicleAllowedZonePayload {
  centerSource: VehicleAllowedZoneCenterSource;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters: number;
  alertMode?: VehicleAllowedZoneAlertMode;
  cooldownSec?: number;
}

export const geofenceServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/geofences', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/geofences/${id}`).then((r) => unwrap<any>(r.data)),
  getPolicyViolations: (params?: Record<string, unknown>) =>
    apiClient.get('/geofences/policy-violations', { params }).then((r) => unwrap<any>(r.data)),
  getVehiclePolicyStates: (vehicleId: string) =>
    apiClient
      .get(`/geofences/vehicles/${vehicleId}/policy-states`)
      .then((r) => unwrap<any>(r.data)),
  getVehicleAllowedZone: (vehicleId: string) =>
    apiClient
      .get(`/geofences/vehicles/${vehicleId}/allowed-zone`)
      .then((r) => unwrap<VehicleAllowedZone | null>(r.data)),
  previewVehicleAllowedZoneCenter: (vehicleId: string) =>
    apiClient
      .post(`/geofences/vehicles/${vehicleId}/allowed-zone/preview-center`)
      .then((r) => unwrap<VehicleAllowedZonePreviewCenter>(r.data)),
  upsertVehicleAllowedZone: (vehicleId: string, data: UpsertVehicleAllowedZonePayload) =>
    apiClient
      .put(`/geofences/vehicles/${vehicleId}/allowed-zone`, data)
      .then((r) => unwrap<VehicleAllowedZone>(r.data)),
  deleteVehicleAllowedZone: (vehicleId: string) =>
    apiClient.delete(`/geofences/vehicles/${vehicleId}/allowed-zone`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/geofences', data).then((r) => unwrap<any>(r.data)),
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/geofences/${id}`, data).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/geofences/${id}`).then((r) => unwrap<any>(r.data)),
  assignVehicle: (id: number, vehicleId: string) =>
    apiClient.post(`/geofences/${id}/vehicles`, { vehicleId }).then((r) => unwrap<any>(r.data)),
  unassignVehicle: (id: number, vehicleId: string) =>
    apiClient.delete(`/geofences/${id}/vehicles/${vehicleId}`).then((r) => unwrap<any>(r.data)),
};
