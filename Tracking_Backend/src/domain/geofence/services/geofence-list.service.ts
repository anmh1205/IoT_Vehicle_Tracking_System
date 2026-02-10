import * as geofenceRepo from '@/domain/geofence/repositories/geofence.repository';
import type { Geofence, GeofenceListQuery, GeofencePublic } from '@/domain/geofence/types/geofence.types';

const sanitizeGeofence = (g: Geofence): GeofencePublic => ({
  id: g.id,
  name: g.name,
  description: g.description,
  geofenceType: g.geofence_type,
  centerLatitude: g.center_latitude,
  centerLongitude: g.center_longitude,
  radiusMeters: g.radius_meters,
  coordinates: g.coordinates,
  triggerOn: g.trigger_on,
  isActive: g.is_active,
  notifyEmail: g.notify_email,
  notifyPush: g.notify_push,
  color: g.color,
  displayHidden: g.display_hidden,
  createdBy: g.created_by,
  createdAt: g.created_at.toISOString(),
  updatedAt: g.updated_at.toISOString(),
});

export const listGeofences = async (
  query: GeofenceListQuery,
): Promise<{ items: GeofencePublic[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await geofenceRepo.findAll(query);

  return {
    items: result.geofences.map(sanitizeGeofence),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};
