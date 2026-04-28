import type { QueryResultRow } from 'pg';
import { findMany, findOne, insertOne } from '@/infrastructure/database/queries';
import type { VehicleZoneAlertMode, VehicleZoneAlertType, VehicleZoneCenterSource, VehicleZoneMembershipState, VehicleZoneType } from '@/domain/zone/types/zone.types';

export interface VehicleZoneRow extends QueryResultRow {
  id: number;
  vehicle_id: string;
  zone_type: VehicleZoneType;
  center_lat: number | null;
  center_lon: number | null;
  radius_m: number | null;
  center_source: VehicleZoneCenterSource | null;
  center_snapshot_at: Date | null;
  boundary_selection_json: unknown | null;
  geometry_json: unknown | null;
  status: 'active' | 'disabled';
  membership_state: VehicleZoneMembershipState;
  last_membership_changed_at: Date | null;
  last_alerted_type: VehicleZoneAlertType | null;
  last_alerted_at: Date | null;
  suppression_until: Date | null;
  alert_mode: VehicleZoneAlertMode;
  cooldown_sec: number;
  warning_json: unknown | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface VehicleZoneVehicleSummaryRow extends VehicleZoneRow {
  vehicle_record_id: number;
  plate_number: string | null;
  customer_name: string | null;
  device_id: string | null;
  vehicle_status: string | null;
}

export interface VehiclePositionSnapshotRow extends QueryResultRow {
  vehicle_id: string;
  plate_number: string | null;
  device_id: string | null;
  latitude: number | null;
  longitude: number | null;
  last_seen_at: Date | null;
}

interface UpsertVehicleZoneParams {
  vehicleId: string;
  zoneType: VehicleZoneType;
  centerLat: number | null;
  centerLon: number | null;
  radiusMeters: number | null;
  centerSource: VehicleZoneCenterSource | null;
  centerSnapshotAt: Date | null;
  boundarySelections: unknown | null;
  geometry: unknown | null;
  alertMode: VehicleZoneAlertMode;
  cooldownSec: number;
  warning: unknown | null;
  actorId?: number;
}

const VEHICLE_ZONE_COLUMNS = `id,
  vehicle_id,
  zone_type,
  center_lat::double precision AS center_lat,
  center_lon::double precision AS center_lon,
  radius_m::double precision AS radius_m,
  center_source,
  center_snapshot_at,
  boundary_selection_json,
  geometry_json,
  status,
  membership_state,
  last_membership_changed_at,
  last_alerted_type,
  last_alerted_at,
  suppression_until,
  alert_mode,
  cooldown_sec,
  warning_json,
  created_by,
  updated_by,
  created_at,
  updated_at`;

export const listVehiclesWithZoneSummary = async (): Promise<VehicleZoneVehicleSummaryRow[]> =>
  findMany<VehicleZoneVehicleSummaryRow>(
    `SELECT
       v.id AS vehicle_record_id,
       v.plate_number,
       c.name AS customer_name,
       v.device_id,
       v.status::text AS vehicle_status,
       ${VEHICLE_ZONE_COLUMNS}
     FROM vehicles v
     LEFT JOIN customers c ON c.id = v.customer_id
     LEFT JOIN vehicle_zones vz ON vz.vehicle_id = v.vehicle_id AND vz.status = 'active'
     ORDER BY v.updated_at DESC, v.id DESC`,
  );

export const getActiveZoneByVehicleId = async (
  vehicleId: string,
): Promise<VehicleZoneRow | null> =>
  findOne<VehicleZoneRow>(
    `SELECT ${VEHICLE_ZONE_COLUMNS}
     FROM vehicle_zones
     WHERE vehicle_id = $1 AND status = 'active'`,
    [vehicleId],
  );

export const upsertActiveZone = async (
  params: UpsertVehicleZoneParams,
): Promise<VehicleZoneRow> =>
  insertOne<VehicleZoneRow>(
    `INSERT INTO vehicle_zones (
      vehicle_id,
      zone_type,
      center_lat,
      center_lon,
      radius_m,
      center_source,
      center_snapshot_at,
      boundary_selection_json,
      geometry_json,
      status,
      membership_state,
      alert_mode,
      cooldown_sec,
      warning_json,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, 'active', 'unknown', $10, $11, $12::jsonb, $13, $13, NOW(), NOW()
    )
    ON CONFLICT (vehicle_id)
    DO UPDATE SET
      zone_type = EXCLUDED.zone_type,
      center_lat = EXCLUDED.center_lat,
      center_lon = EXCLUDED.center_lon,
      radius_m = EXCLUDED.radius_m,
      center_source = EXCLUDED.center_source,
      center_snapshot_at = EXCLUDED.center_snapshot_at,
      boundary_selection_json = EXCLUDED.boundary_selection_json,
      geometry_json = EXCLUDED.geometry_json,
      status = 'active',
      membership_state = 'unknown',
      last_membership_changed_at = NULL,
      last_alerted_type = NULL,
      last_alerted_at = NULL,
      suppression_until = NULL,
      alert_mode = EXCLUDED.alert_mode,
      cooldown_sec = EXCLUDED.cooldown_sec,
      warning_json = EXCLUDED.warning_json,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING ${VEHICLE_ZONE_COLUMNS}`,
    [
      params.vehicleId,
      params.zoneType,
      params.centerLat,
      params.centerLon,
      params.radiusMeters,
      params.centerSource,
      params.centerSnapshotAt?.toISOString() ?? null,
      params.boundarySelections ? JSON.stringify(params.boundarySelections) : null,
      params.geometry ? JSON.stringify(params.geometry) : null,
      params.alertMode,
      params.cooldownSec,
      params.warning ? JSON.stringify(params.warning) : null,
      params.actorId ?? null,
    ],
  );

export const disableActiveZone = async (
  vehicleId: string,
  actorId?: number,
): Promise<VehicleZoneRow | null> =>
  findOne<VehicleZoneRow>(
    `UPDATE vehicle_zones
     SET status = 'disabled', updated_by = $2, updated_at = NOW()
     WHERE vehicle_id = $1 AND status = 'active'
     RETURNING ${VEHICLE_ZONE_COLUMNS}`,
    [vehicleId, actorId ?? null],
  );

export const getVehiclePositionSnapshot = async (
  vehicleId: string,
): Promise<VehiclePositionSnapshotRow | null> =>
  findOne<VehiclePositionSnapshotRow>(
    `SELECT
       v.vehicle_id,
       v.plate_number,
       v.device_id,
       d.latitude,
       d.longitude,
       d.last_seen_at
     FROM vehicles v
     LEFT JOIN devices d ON d.device_id = v.device_id
     WHERE v.vehicle_id = $1`,
    [vehicleId],
  );
