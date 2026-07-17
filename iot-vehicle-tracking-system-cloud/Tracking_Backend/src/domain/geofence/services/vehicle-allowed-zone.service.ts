import { createConflictError, createNotFoundError } from '@/shared/utils/errors.util';
import { logger } from '@/infrastructure/logger';
import { publishEvent } from '@/infrastructure/realtime';
import * as vehicleAllowedZoneRepo from '@/domain/geofence/repositories/vehicle-allowed-zone.repository';
import * as vehicleRepo from '@/domain/vehicle/repositories/vehicle.repository';
import type {
  UpsertVehicleAllowedZoneInput,
  VehicleAllowedZone,
  VehicleAllowedZonePreviewCenterPublic,
  VehicleAllowedZonePublic,
  VehicleAllowedZoneWarning,
} from '@/domain/geofence/types/geofence.types';

const STALE_POSITION_THRESHOLD_MS = 15 * 60 * 1000;

const parseWarning = (value: unknown): VehicleAllowedZoneWarning | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as VehicleAllowedZoneWarning;
    } catch {
      return null;
    }
  }
  return value as VehicleAllowedZoneWarning;
};

const toPublic = (zone: VehicleAllowedZone): VehicleAllowedZonePublic => ({
  id: zone.id,
  vehicleId: zone.vehicle_id,
  zoneType: zone.zone_type,
  centerLatitude: zone.center_lat,
  centerLongitude: zone.center_lon,
  radiusMeters: zone.radius_m,
  centerSource: zone.center_source,
  centerSnapshotAt: zone.center_snapshot_at?.toISOString() ?? null,
  status: zone.status,
  membershipState: zone.last_membership_state,
  lastMembershipChangedAt: zone.last_membership_changed_at?.toISOString() ?? null,
  lastAlertedState: zone.last_alerted_state,
  lastAlertedAt: zone.last_alerted_at?.toISOString() ?? null,
  suppressionUntil: zone.suppression_until?.toISOString() ?? null,
  alertMode: zone.alert_mode,
  cooldownSec: zone.cooldown_sec,
  warning: parseWarning(zone.source_warning_json),
  createdBy: zone.created_by,
  updatedBy: zone.updated_by,
  createdAt: zone.created_at.toISOString(),
  updatedAt: zone.updated_at.toISOString(),
});

const buildVehiclePositionPreview = async (
  vehicleId: string,
): Promise<VehicleAllowedZonePreviewCenterPublic> => {
  const snapshot = await vehicleAllowedZoneRepo.getVehiclePositionSnapshot(vehicleId);
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

  let warning: VehicleAllowedZoneWarning | null = null;
  if (isStale) {
    warning = snapshotAt
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
        };
  }

  return {
    vehicleId: snapshot.vehicle_id,
    plateNumber: snapshot.plate_number,
    deviceId: snapshot.device_id,
    centerLatitude: snapshot.latitude,
    centerLongitude: snapshot.longitude,
    centerSource: 'vehicle_position',
    snapshotAt: snapshotAt?.toISOString() ?? null,
    isStale,
    staleAgeSec,
    warning,
  };
};

export const getVehicleAllowedZone = async (
  vehicleId: string,
): Promise<VehicleAllowedZonePublic | null> => {
  const zone = await vehicleAllowedZoneRepo.getActiveZoneByVehicleId(vehicleId);
  return zone ? toPublic(zone as VehicleAllowedZone) : null;
};

export const previewVehicleAllowedZoneCenter = async (
  vehicleId: string,
): Promise<VehicleAllowedZonePreviewCenterPublic> => buildVehiclePositionPreview(vehicleId);

export const upsertVehicleAllowedZone = async (
  vehicleId: string,
  input: UpsertVehicleAllowedZoneInput,
  actorId?: number,
): Promise<VehicleAllowedZonePublic> => {
  if (input.centerSource === 'map_pick') {
    const vehicle = await vehicleRepo.findByVehicleId(vehicleId);
    if (!vehicle) {
      throw createNotFoundError(`Vehicle with ID ${vehicleId} not found`);
    }
  }

  const preview =
    input.centerSource === 'vehicle_position'
      ? await buildVehiclePositionPreview(vehicleId)
      : null;

  const zone = await vehicleAllowedZoneRepo.upsertActiveZone({
    vehicleId,
    centerLat: preview?.centerLatitude ?? input.centerLatitude ?? 0,
    centerLon: preview?.centerLongitude ?? input.centerLongitude ?? 0,
    radiusMeters: input.radiusMeters,
    centerSource: input.centerSource,
    centerSnapshotAt: preview?.snapshotAt ? new Date(preview.snapshotAt) : null,
    alertMode: input.alertMode ?? 'transition_only',
    cooldownSec: input.cooldownSec ?? 300,
    sourceWarning: preview?.warning ?? null,
    actorId,
  });

  logger.info('Vehicle allowed zone upserted', {
    vehicleId,
    centerSource: input.centerSource,
    actorId: actorId ?? null,
  });

  const publicZone = toPublic(zone as VehicleAllowedZone);
  publishEvent('zone:updated', {
    vehicle_id: vehicleId,
    zone_id: publicZone.id,
    status: publicZone.status,
    membership_state: publicZone.membershipState,
    last_changed_at: publicZone.lastMembershipChangedAt,
  });

  return publicZone;
};

export const disableVehicleAllowedZone = async (
  vehicleId: string,
  actorId?: number,
): Promise<{ success: true }> => {
  const zone = await vehicleAllowedZoneRepo.disableActiveZone(vehicleId, actorId);
  if (!zone) {
    throw createNotFoundError(`Active allowed zone for vehicle ${vehicleId} not found`);
  }

  logger.info('Vehicle allowed zone disabled', { vehicleId, actorId: actorId ?? null });
  publishEvent('zone:updated', {
    vehicle_id: vehicleId,
    zone_id: null,
    status: 'disabled',
  });
  return { success: true };
};
