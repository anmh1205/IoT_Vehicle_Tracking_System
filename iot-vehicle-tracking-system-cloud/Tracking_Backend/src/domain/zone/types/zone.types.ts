export type VehicleZoneType = 'circle' | 'administrative_boundary';
export type VehicleZoneStatus = 'active' | 'disabled';
export type VehicleZoneCenterSource = 'vehicle_position' | 'map_pick';
export type VehicleZoneMembershipState = 'unknown' | 'inside' | 'outside' | 'suspect';
export type VehicleZoneAlertMode =
  | 'transition_only'
  | 'transition_and_recovery'
  | 'periodic_while_outside'
  | 'silent';
export type VehicleZoneAlertType = 'zone_enter' | 'zone_exit' | 'zone_outside_periodic';
export type ZoneBoundaryLevel = 'province' | 'district' | 'ward';

export interface GeoJsonGeometry {
  type: string;
  coordinates?: unknown;
  geometries?: GeoJsonGeometry[];
}

export interface VehicleZoneWarning {
  code: 'STALE_POSITION' | 'POSITION_TIMESTAMP_UNAVAILABLE' | 'BOUNDARY_RESOLVE_FAILED';
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
  status: VehicleZoneStatus;
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

export type UpsertVehicleZoneInput =
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

export interface SearchZoneBoundariesQuery {
  query?: string;
  level?: ZoneBoundaryLevel;
  parentCode?: string;
  limit?: number;
}

export interface ResolveZoneBoundariesInput {
  selections: Array<{
    provider?: string;
    unitCode: string;
  }>;
}

export interface ResolveZoneBoundariesResult {
  selections: ZoneBoundarySelection[];
  geometry: GeoJsonGeometry | null;
}
