import type { QueryResultRow } from 'pg';
import { findOne } from '@/infrastructure/database/queries';
import { geofenceGlobalScope, type GeofenceAccessScope } from './vehicle-policy.repository';

export interface VehicleAllowedZoneRow extends QueryResultRow {
  id: number;
  vehicle_id: string;
  zone_type: 'circle';
  center_lat: number;
  center_lon: number;
  radius_m: number;
  center_source: 'vehicle_position' | 'map_pick';
  center_snapshot_at: Date | null;
  status: 'active' | 'disabled';
  last_membership_state: 'unknown' | 'inside' | 'outside' | 'suspect';
  last_membership_changed_at: Date | null;
  last_alerted_state: 'unknown' | 'inside' | 'outside' | 'suspect' | null;
  last_alerted_at: Date | null;
  suppression_until: Date | null;
  alert_mode: 'transition_only' | 'transition_and_recovery' | 'periodic_while_outside' | 'silent';
  cooldown_sec: number;
  source_warning_json: unknown | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface VehiclePositionSnapshotRow extends QueryResultRow {
  vehicle_id: string;
  plate_number: string | null;
  device_id: string | null;
  latitude: number | null;
  longitude: number | null;
  last_seen_at: Date | null;
}

interface UpsertVehicleAllowedZoneParams {
  vehicleId: string;
  centerLat: number;
  centerLon: number;
  radiusMeters: number;
  centerSource: 'vehicle_position' | 'map_pick';
  centerSnapshotAt: Date | null;
  alertMode: 'transition_only' | 'transition_and_recovery' | 'periodic_while_outside' | 'silent';
  cooldownSec: number;
  sourceWarning: unknown | null;
  actorId?: number;
  scope: GeofenceAccessScope;
}

export const getActiveZoneByVehicleId = async (
  vehicleId: string, scope: GeofenceAccessScope,
): Promise<VehicleAllowedZoneRow | null> =>
  findOne<VehicleAllowedZoneRow>(
    `SELECT z.*
     FROM vehicle_allowed_zones z
     WHERE z.vehicle_id = $1 AND z.status = 'active'
       AND ($2::boolean OR EXISTS (
         SELECT 1 FROM vehicles v JOIN user_device_access uda ON uda.device_id = v.device_id
         WHERE v.vehicle_id = z.vehicle_id AND uda.user_id = $3
       ))`,
    [vehicleId, geofenceGlobalScope(scope), scope.userId],
  );

export const upsertActiveZone = async (
  params: UpsertVehicleAllowedZoneParams,
): Promise<VehicleAllowedZoneRow | null> =>
  findOne<VehicleAllowedZoneRow>(
    `INSERT INTO vehicle_allowed_zones (
      vehicle_id,
      zone_type,
      center_lat,
      center_lon,
      radius_m,
      center_source,
      center_snapshot_at,
      status,
      last_membership_state,
      last_membership_changed_at,
      last_alerted_state,
      last_alerted_at,
      suppression_until,
      alert_mode,
      cooldown_sec,
      source_warning_json,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) SELECT
      $1, 'circle', $2, $3, $4, $5, $6, 'active', 'unknown', NULL, NULL, NULL, NULL, $7, $8, $9::jsonb, $10, $10, NOW(), NOW()
    WHERE $11::boolean OR EXISTS (
      SELECT 1 FROM vehicles v JOIN user_device_access uda ON uda.device_id = v.device_id
      WHERE v.vehicle_id = $1 AND uda.user_id = $12
    )
    ON CONFLICT (vehicle_id)
    DO UPDATE SET
      zone_type = 'circle',
      center_lat = EXCLUDED.center_lat,
      center_lon = EXCLUDED.center_lon,
      radius_m = EXCLUDED.radius_m,
      center_source = EXCLUDED.center_source,
      center_snapshot_at = EXCLUDED.center_snapshot_at,
      status = 'active',
      last_membership_state = 'unknown',
      last_membership_changed_at = NULL,
      last_alerted_state = NULL,
      last_alerted_at = NULL,
      suppression_until = NULL,
      alert_mode = EXCLUDED.alert_mode,
      cooldown_sec = EXCLUDED.cooldown_sec,
      source_warning_json = EXCLUDED.source_warning_json,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    WHERE $11::boolean OR EXISTS (
      SELECT 1 FROM vehicles v JOIN user_device_access uda ON uda.device_id = v.device_id
      WHERE v.vehicle_id = vehicle_allowed_zones.vehicle_id AND uda.user_id = $12
    )
    RETURNING *`,
    [
      params.vehicleId,
      params.centerLat,
      params.centerLon,
      params.radiusMeters,
      params.centerSource,
      params.centerSnapshotAt?.toISOString() ?? null,
      params.alertMode,
      params.cooldownSec,
      params.sourceWarning ? JSON.stringify(params.sourceWarning) : null,
      params.actorId ?? null,
      geofenceGlobalScope(params.scope),
      params.scope.userId,
    ],
  );

export const disableActiveZone = async (
  vehicleId: string,
  scope: GeofenceAccessScope,
  actorId?: number,
): Promise<VehicleAllowedZoneRow | null> =>
  findOne<VehicleAllowedZoneRow>(
    `UPDATE vehicle_allowed_zones
     SET status = 'disabled', updated_by = $2, updated_at = NOW()
     WHERE vehicle_id = $1 AND status = 'active'
       AND ($3::boolean OR EXISTS (
         SELECT 1 FROM vehicles v JOIN user_device_access uda ON uda.device_id = v.device_id
         WHERE v.vehicle_id = vehicle_allowed_zones.vehicle_id AND uda.user_id = $4
       ))
     RETURNING *`,
    [vehicleId, actorId ?? null, geofenceGlobalScope(scope), scope.userId],
  );

export const getVehiclePositionSnapshot = async (
  vehicleId: string, scope: GeofenceAccessScope,
): Promise<VehiclePositionSnapshotRow | null> =>
  findOne<VehiclePositionSnapshotRow>(
    `SELECT
       v.vehicle_id,
       v.plate_number,
       v.device_id,
       COALESCE(d.last_latitude, d.latitude)::double precision AS latitude,
       COALESCE(d.last_longitude, d.longitude)::double precision AS longitude,
       d.last_seen_at
     FROM vehicles v
     LEFT JOIN devices d ON d.device_id = v.device_id
     WHERE v.vehicle_id = $1
       AND ($2::boolean OR EXISTS (
         SELECT 1 FROM user_device_access uda
         WHERE uda.user_id = $3 AND uda.device_id = v.device_id
       ))`,
    [vehicleId, geofenceGlobalScope(scope), scope.userId],
  );
