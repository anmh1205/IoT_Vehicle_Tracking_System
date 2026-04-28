import { createConflictError, createNotFoundError } from '@/shared/utils/errors.util';
import { logger } from '@/infrastructure/logger';
import { publishEvent } from '@/infrastructure/realtime';
import { buildCircleGeometry, parseGeoJsonGeometry } from '@/shared/utils/zone-geometry.util';
import * as vehicleRepo from '@/domain/vehicle/repositories/vehicle.repository';
import * as vehicleZoneRepo from '@/domain/zone/repositories/vehicle-zone.repository';
import * as zoneBoundaryService from '@/domain/zone/services/zone-boundary.service';
import type { ResolveZoneBoundariesInput, ResolveZoneBoundariesResult, UpsertVehicleZoneInput, VehicleZone, VehicleZonePreviewCircleCenter, VehicleZoneVehicleSummary, VehicleZoneWarning } from '@/domain/zone/types/zone.types';

const STALE_POSITION_THRESHOLD_MS = 15 * 60 * 1000;

const parseWarning = (value: unknown): VehicleZoneWarning | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as VehicleZoneWarning;
    } catch {
      return null;
    }
  }
  return value as VehicleZoneWarning;
};

const toPublic = (zone: vehicleZoneRepo.VehicleZoneRow | null): VehicleZone | null => {
  if (!zone) {
    return null;
  }

  return {
    id: zone.id,
    vehicleId: zone.vehicle_id,
    zoneType: zone.zone_type,
    circleCenterLatitude: zone.center_lat,
    circleCenterLongitude: zone.center_lon,
    radiusMeters: zone.radius_m,
    centerSource: zone.center_source,
    centerSnapshotAt: zone.center_snapshot_at?.toISOString() ?? null,
    boundarySelections: Array.isArray(zone.boundary_selection_json)
      ? zone.boundary_selection_json
      : [],
    geometry:
      parseGeoJsonGeometry(zone.geometry_json) ??
      (zone.zone_type === 'circle' && zone.center_lat != null && zone.center_lon != null && zone.radius_m != null
        ? buildCircleGeometry(zone.center_lat, zone.center_lon, zone.radius_m)
        : null),
    status: zone.status,
    membershipState: zone.membership_state,
    lastMembershipChangedAt: zone.last_membership_changed_at?.toISOString() ?? null,
    lastAlertedType: zone.last_alerted_type,
    lastAlertedAt: zone.last_alerted_at?.toISOString() ?? null,
    suppressionUntil: zone.suppression_until?.toISOString() ?? null,
    alertMode: zone.alert_mode,
    cooldownSec: zone.cooldown_sec,
    warning: parseWarning(zone.warning_json),
    createdBy: zone.created_by,
    updatedBy: zone.updated_by,
    createdAt: zone.created_at.toISOString(),
    updatedAt: zone.updated_at.toISOString(),
  };
};

const buildVehiclePositionPreview = async (
  vehicleId: string,
): Promise<VehicleZonePreviewCircleCenter> => {
  const snapshot = await vehicleZoneRepo.getVehiclePositionSnapshot(vehicleId);
  if (!snapshot) {
    throw createNotFoundError(`Vehicle with ID ${vehicleId} not found`);
  }
  if (snapshot.latitude == null || snapshot.longitude == null) {
    throw createConflictError('Current vehicle position is unavailable');
  }

  const snapshotAt = snapshot.last_seen_at;
  const staleAgeSec = snapshotAt
    ? Math.max(0, Math.floor((Date.now() - snapshotAt.getTime()) / 1000))
    : null;
  const isStale = snapshotAt ? Date.now() - snapshotAt.getTime() > STALE_POSITION_THRESHOLD_MS : true;

  const warning: VehicleZoneWarning | null = isStale
    ? snapshotAt
      ? {
          code: 'STALE_POSITION',
          message: 'Using latest-known vehicle position because telemetry is stale',
          staleAgeSec,
          snapshotAt: snapshotAt.toISOString(),
        }
      : {
          code: 'POSITION_TIMESTAMP_UNAVAILABLE',
          message: 'Using latest-known vehicle position without a telemetry timestamp',
          staleAgeSec: null,
          snapshotAt: null,
        }
    : null;

  return {
    vehicleId: snapshot.vehicle_id,
    plateNumber: snapshot.plate_number,
    deviceId: snapshot.device_id,
    circleCenterLatitude: snapshot.latitude,
    circleCenterLongitude: snapshot.longitude,
    centerSource: 'vehicle_position',
    snapshotAt: snapshotAt?.toISOString() ?? null,
    isStale,
    staleAgeSec,
    warning,
  };
};

export const listVehicleZones = async (): Promise<{ items: VehicleZoneVehicleSummary[] }> => {
  const rows = await vehicleZoneRepo.listVehiclesWithZoneSummary();
  return {
    items: rows.map((row) => ({
      id: row.vehicle_record_id,
      vehicleId: row.vehicle_id,
      plateNumber: row.plate_number,
      customerName: row.customer_name,
      deviceId: row.device_id,
      status: row.vehicle_status,
      zone: row.id ? toPublic(row) : null,
    })),
  };
};

export const getVehicleZone = async (vehicleId: string): Promise<VehicleZone | null> =>
  toPublic(await vehicleZoneRepo.getActiveZoneByVehicleId(vehicleId));

export const previewVehicleZoneCircleCenter = async (
  vehicleId: string,
): Promise<VehicleZonePreviewCircleCenter> => buildVehiclePositionPreview(vehicleId);

export const searchZoneBoundaries = zoneBoundaryService.searchZoneBoundaries;
export const resolveZoneBoundaries = (
  input: ResolveZoneBoundariesInput,
): Promise<ResolveZoneBoundariesResult> => zoneBoundaryService.resolveZoneBoundaries(input);

export const upsertVehicleZone = async (
  vehicleId: string,
  input: UpsertVehicleZoneInput,
  actorId?: number,
): Promise<VehicleZone> => {
  const vehicle = await vehicleRepo.findByVehicleId(vehicleId);
  if (!vehicle) {
    throw createNotFoundError(`Vehicle with ID ${vehicleId} not found`);
  }

  const alertMode = input.alertMode ?? 'transition_only';
  const cooldownSec = input.cooldownSec ?? 300;
  const circlePreview = input.zoneType === 'circle' && input.centerSource === 'vehicle_position'
    ? await buildVehiclePositionPreview(vehicleId)
    : null;
  const boundary = input.zoneType === 'administrative_boundary'
    ? await zoneBoundaryService.resolveZoneBoundaries({
        selections: input.boundarySelections,
      })
    : null;
  const zone = await vehicleZoneRepo.upsertActiveZone({
    vehicleId,
    zoneType: input.zoneType,
    centerLat:
      input.zoneType === 'circle'
        ? circlePreview?.circleCenterLatitude ?? input.circleCenterLatitude ?? null
        : null,
    centerLon:
      input.zoneType === 'circle'
        ? circlePreview?.circleCenterLongitude ?? input.circleCenterLongitude ?? null
        : null,
    radiusMeters: input.zoneType === 'circle' ? input.radiusMeters : null,
    centerSource: input.zoneType === 'circle' ? input.centerSource : null,
    centerSnapshotAt:
      input.zoneType === 'circle' && circlePreview?.snapshotAt
        ? new Date(circlePreview.snapshotAt)
        : null,
    boundarySelections: boundary?.selections ?? null,
    geometry:
      input.zoneType === 'circle'
        ? buildCircleGeometry(
            circlePreview?.circleCenterLatitude ?? input.circleCenterLatitude ?? 0,
            circlePreview?.circleCenterLongitude ?? input.circleCenterLongitude ?? 0,
            input.radiusMeters,
          )
        : boundary?.geometry ?? null,
    alertMode,
    cooldownSec,
    warning: circlePreview?.warning ?? null,
    actorId,
  });

  logger.info('Vehicle zone upserted', { vehicleId, zoneType: input.zoneType, actorId: actorId ?? null });
  publishEvent('zone:updated', {
    vehicle_id: vehicleId,
    zone_id: zone.id,
    status: zone.status,
    membership_state: zone.membership_state,
    last_changed_at: zone.last_membership_changed_at?.toISOString() ?? null,
  });

  return toPublic(zone)!;
};

export const disableVehicleZone = async (
  vehicleId: string,
  actorId?: number,
): Promise<{ success: true }> => {
  const zone = await vehicleZoneRepo.disableActiveZone(vehicleId, actorId);
  if (!zone) {
    throw createNotFoundError(`Active zone for vehicle ${vehicleId} not found`);
  }

  logger.info('Vehicle zone disabled', { vehicleId, actorId: actorId ?? null });
  publishEvent('zone:updated', {
    vehicle_id: vehicleId,
    zone_id: null,
    status: 'disabled',
    membership_state: zone.membership_state,
    last_changed_at: zone.last_membership_changed_at?.toISOString() ?? null,
  });
  return { success: true };
};
