import { apiClient, unwrap } from './client';

export type VehicleZoneType = 'circle' | 'administrative_boundary';
export type VehicleZoneCenterSource = 'vehicle_position' | 'map_pick';
export type VehicleZoneMembershipState = 'unknown' | 'inside' | 'outside' | 'suspect';
export type VehicleZoneAlertMode =
  | 'transition_only'
  | 'transition_and_recovery'
  | 'periodic_while_outside'
  | 'silent';
export type VehicleZoneAlertType = 'zone_enter' | 'zone_exit' | 'zone_outside_periodic';
export type ZoneBoundaryLevel = 'province' | 'district' | 'ward';

export interface VehicleZoneWarning {
  code: string;
  message: string;
  staleAgeSec?: number | null;
  snapshotAt?: string | null;
}

export interface ZoneBoundarySelection {
  provider: string;
  unitCode: string;
  unitName: string;
  fullName: string | null;
  level: ZoneBoundaryLevel;
  parentCode: string | null;
}

export interface ZoneBoundaryUnit extends ZoneBoundarySelection {
  syncVersion: string | null;
  syncedAt: string | null;
}

export interface GeoJsonGeometry {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
}

export interface VehicleZone {
  id: number;
  vehicleId: string;
  zoneType: VehicleZoneType;
  circleCenterLatitude: number | null;
  circleCenterLongitude: number | null;
  radiusMeters: number | null;
  centerSource: VehicleZoneCenterSource | null;
  centerSnapshotAt: string | null;
  boundarySelections: ZoneBoundarySelection[];
  geometry: GeoJsonGeometry | null;
  status: 'active' | 'disabled';
  membershipState: VehicleZoneMembershipState;
  lastMembershipChangedAt: string | null;
  lastAlertedType: VehicleZoneAlertType | null;
  lastAlertedAt: string | null;
  suppressionUntil: string | null;
  alertMode: VehicleZoneAlertMode;
  cooldownSec: number;
  warning: VehicleZoneWarning | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleZoneVehicleSummary {
  id: number;
  vehicleId: string;
  plateNumber: string | null;
  customerName: string | null;
  deviceId: string | null;
  status: string | null;
  zone: VehicleZone | null;
}

export interface VehicleZonePreviewCircleCenter {
  vehicleId: string;
  plateNumber: string | null;
  deviceId: string | null;
  circleCenterLatitude: number;
  circleCenterLongitude: number;
  centerSource: 'vehicle_position';
  snapshotAt: string | null;
  isStale: boolean;
  staleAgeSec: number | null;
  warning: VehicleZoneWarning | null;
}

export type UpsertVehicleZonePayload =
  | {
      zoneType: 'circle';
      centerSource: VehicleZoneCenterSource;
      circleCenterLatitude?: number;
      circleCenterLongitude?: number;
      radiusMeters: number;
      alertMode?: VehicleZoneAlertMode;
      cooldownSec?: number;
    }
  | {
      zoneType: 'administrative_boundary';
      boundarySelections: Array<{
        provider?: string;
        unitCode: string;
      }>;
      alertMode?: VehicleZoneAlertMode;
      cooldownSec?: number;
    };

export interface ListZoneBoundariesParams {
  query?: string;
  level?: ZoneBoundaryLevel;
  parentCode?: string;
  limit?: number;
}

export interface ResolveZoneBoundariesPayload {
  selections: Array<{
    provider?: string;
    unitCode: string;
  }>;
}

export interface ResolveZoneBoundariesResult {
  selections: ZoneBoundarySelection[];
  geometry: GeoJsonGeometry | null;
}

const toNumber = (value: number | string) => Number(value);

const toNullableNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
};

const normalizeZoneWarning = (
  warning: VehicleZoneWarning | null | undefined,
): VehicleZoneWarning | null => {
  if (!warning) {
    return null;
  }

  return {
    ...warning,
    staleAgeSec: toNullableNumber(warning.staleAgeSec),
  };
};

const normalizeZone = (zone: VehicleZone | null | undefined): VehicleZone | null => {
  if (!zone) {
    return null;
  }

  return {
    ...zone,
    id: toNumber(zone.id),
    circleCenterLatitude: toNullableNumber(zone.circleCenterLatitude),
    circleCenterLongitude: toNullableNumber(zone.circleCenterLongitude),
    radiusMeters: toNullableNumber(zone.radiusMeters),
    cooldownSec: toNumber(zone.cooldownSec),
    warning: normalizeZoneWarning(zone.warning),
    createdBy: toNullableNumber(zone.createdBy),
    updatedBy: toNullableNumber(zone.updatedBy),
    boundarySelections: Array.isArray(zone.boundarySelections) ? zone.boundarySelections : [],
  };
};

const normalizeZoneVehicleSummary = (
  item: VehicleZoneVehicleSummary,
): VehicleZoneVehicleSummary => ({
  ...item,
  id: toNumber(item.id),
  zone: normalizeZone(item.zone),
});

const normalizeZonePreviewCircleCenter = (
  preview: VehicleZonePreviewCircleCenter,
): VehicleZonePreviewCircleCenter => ({
  ...preview,
  circleCenterLatitude: toNumber(preview.circleCenterLatitude),
  circleCenterLongitude: toNumber(preview.circleCenterLongitude),
  staleAgeSec: toNullableNumber(preview.staleAgeSec),
  warning: normalizeZoneWarning(preview.warning),
});

export const zoneServices = {
  listVehicleZones: () =>
    apiClient.get('/zones/vehicles').then((response) => {
      const payload = unwrap<{ items: VehicleZoneVehicleSummary[] }>(response.data);
      return {
        ...payload,
        items: (payload.items ?? []).map(normalizeZoneVehicleSummary),
      };
    }),
  getVehicleZone: (vehicleId: string) =>
    apiClient
      .get(`/zones/vehicles/${vehicleId}`)
      .then((response) => normalizeZone(unwrap<VehicleZone | null>(response.data))),
  previewVehicleZoneCircleCenter: (vehicleId: string) =>
    apiClient
      .post(`/zones/vehicles/${vehicleId}/preview-circle-center`)
      .then((response) =>
        normalizeZonePreviewCircleCenter(unwrap<VehicleZonePreviewCircleCenter>(response.data)),
      ),
  upsertVehicleZone: (vehicleId: string, data: UpsertVehicleZonePayload) =>
    apiClient
      .put(`/zones/vehicles/${vehicleId}`, data)
      .then((response) => normalizeZone(unwrap<VehicleZone>(response.data))),
  deleteVehicleZone: (vehicleId: string) =>
    apiClient.delete(`/zones/vehicles/${vehicleId}`).then((response) => unwrap(response.data)),
  listBoundaries: (params?: ListZoneBoundariesParams) =>
    apiClient.get('/zones/boundaries', { params }).then((response) => {
      const payload = unwrap<{ items: ZoneBoundaryUnit[] }>(response.data);
      return {
        ...payload,
        items: Array.isArray(payload.items) ? payload.items : [],
      };
    }),
  resolveBoundaries: (data: ResolveZoneBoundariesPayload) =>
    apiClient
      .post('/zones/boundaries/resolve', data)
      .then((response) => unwrap<ResolveZoneBoundariesResult>(response.data)),
};
