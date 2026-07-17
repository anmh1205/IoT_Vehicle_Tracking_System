import { apiClient, unwrap } from './client';
import {
  zoneServices,
  type GeoJsonGeometry,
  type VehicleZone,
  type VehicleZonePreviewCircleCenter,
  type ZoneBoundarySelection,
} from './zones';

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
  zoneType: 'circle' | 'administrative_boundary';
  centerLatitude: number | null;
  centerLongitude: number | null;
  radiusMeters: number | null;
  centerSource: VehicleAllowedZoneCenterSource | null;
  centerSnapshotAt: string | null;
  boundarySelections?: ZoneBoundarySelection[];
  geometry?: GeoJsonGeometry | null;
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

const toNumber = (value: number | string) => Number(value);

const toNullableNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
};

const normalizeAllowedZoneWarning = (
  warning:
    | VehicleAllowedZoneWarning
    | {
        code: string;
        message: string;
        staleAgeSec?: number | null;
        snapshotAt?: string | null;
      }
    | null
    | undefined,
): VehicleAllowedZoneWarning | null => {
  if (!warning) {
    return null;
  }

  return {
    code: warning.code,
    message: warning.message,
    staleAgeSec: toNullableNumber(warning.staleAgeSec),
    snapshotAt: warning.snapshotAt ?? null,
  };
};

const normalizeVehicleAllowedZone = (
  zone: VehicleAllowedZone | null | undefined,
): VehicleAllowedZone | null => {
  if (!zone) {
    return null;
  }

  return {
    ...zone,
    id: toNumber(zone.id),
    centerLatitude: toNullableNumber(zone.centerLatitude),
    centerLongitude: toNullableNumber(zone.centerLongitude),
    radiusMeters: toNullableNumber(zone.radiusMeters),
    cooldownSec: toNumber(zone.cooldownSec),
    warning: normalizeAllowedZoneWarning(zone.warning),
    createdBy: toNullableNumber(zone.createdBy),
    updatedBy: toNullableNumber(zone.updatedBy),
    boundarySelections: Array.isArray(zone.boundarySelections) ? zone.boundarySelections : [],
  };
};

const normalizeVehicleAllowedZonePreviewCenter = (
  preview: VehicleAllowedZonePreviewCenter,
): VehicleAllowedZonePreviewCenter => ({
  ...preview,
  centerLatitude: toNumber(preview.centerLatitude),
  centerLongitude: toNumber(preview.centerLongitude),
  staleAgeSec: toNullableNumber(preview.staleAgeSec),
  warning: normalizeAllowedZoneWarning(preview.warning),
});

const toLegacyLastAlertedState = (
  lastAlertedType: VehicleZone['lastAlertedType'],
): VehicleAllowedZoneMembershipState | null => {
  if (lastAlertedType === 'zone_enter') {
    return 'inside';
  }

  if (lastAlertedType === 'zone_exit' || lastAlertedType === 'zone_outside_periodic') {
    return 'outside';
  }

  return null;
};

const mapZoneToLegacyAllowedZone = (
  zone: VehicleZone | null | undefined,
): VehicleAllowedZone | null => {
  if (!zone) {
    return null;
  }

  return normalizeVehicleAllowedZone({
    id: zone.id,
    vehicleId: zone.vehicleId,
    zoneType: zone.zoneType,
    centerLatitude: zone.circleCenterLatitude,
    centerLongitude: zone.circleCenterLongitude,
    radiusMeters: zone.radiusMeters,
    centerSource: zone.centerSource,
    centerSnapshotAt: zone.centerSnapshotAt,
    boundarySelections: zone.boundarySelections,
    geometry: zone.geometry,
    status: zone.status,
    membershipState: zone.membershipState,
    lastMembershipChangedAt: zone.lastMembershipChangedAt,
    lastAlertedState: toLegacyLastAlertedState(zone.lastAlertedType),
    lastAlertedAt: zone.lastAlertedAt,
    suppressionUntil: zone.suppressionUntil,
    alertMode: zone.alertMode,
    cooldownSec: zone.cooldownSec,
    warning: normalizeAllowedZoneWarning(zone.warning),
    createdBy: zone.createdBy,
    updatedBy: zone.updatedBy,
    createdAt: zone.createdAt,
    updatedAt: zone.updatedAt,
  });
};

const mapZonePreviewToLegacyPreview = (
  preview: VehicleZonePreviewCircleCenter,
): VehicleAllowedZonePreviewCenter =>
  normalizeVehicleAllowedZonePreviewCenter({
    vehicleId: preview.vehicleId,
    plateNumber: preview.plateNumber,
    deviceId: preview.deviceId,
    centerLatitude: preview.circleCenterLatitude,
    centerLongitude: preview.circleCenterLongitude,
    centerSource: preview.centerSource,
    snapshotAt: preview.snapshotAt,
    isStale: preview.isStale,
    staleAgeSec: preview.staleAgeSec,
    warning: normalizeAllowedZoneWarning(preview.warning),
  });

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
    zoneServices.getVehicleZone(vehicleId).then(mapZoneToLegacyAllowedZone),
  previewVehicleAllowedZoneCenter: (vehicleId: string) =>
    zoneServices.previewVehicleZoneCircleCenter(vehicleId).then(mapZonePreviewToLegacyPreview),
  upsertVehicleAllowedZone: (vehicleId: string, data: UpsertVehicleAllowedZonePayload) =>
    zoneServices
      .upsertVehicleZone(vehicleId, {
        zoneType: 'circle',
        centerSource: data.centerSource,
        circleCenterLatitude: data.centerLatitude,
        circleCenterLongitude: data.centerLongitude,
        radiusMeters: data.radiusMeters,
        alertMode: data.alertMode,
        cooldownSec: data.cooldownSec,
      })
      .then(mapZoneToLegacyAllowedZone),
  deleteVehicleAllowedZone: (vehicleId: string) =>
    zoneServices.deleteVehicleZone(vehicleId),
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
