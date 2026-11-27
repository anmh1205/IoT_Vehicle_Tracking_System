import type { SessionUser } from '@/shared/types/common.types';

export interface TripReadScope {
  userId: number;
  role: string;
  deviceAccessMode: string;
}

export const toTripReadScope = (user: SessionUser): TripReadScope => ({
  userId: user.id,
  role: user.role,
  deviceAccessMode: user.deviceAccessMode,
});

export const hasFullFleetTripAccess = (actor: TripReadScope): boolean =>
  actor.role === 'root' || actor.role === 'admin' || actor.deviceAccessMode === 'all';

// Apply to trip rows selected with the alias `t`.
export const tripVisibleTo = (actor: TripReadScope, param: number): string =>
  hasFullFleetTripAccess(actor) ? 'TRUE' : `EXISTS (
    SELECT 1 FROM user_device_access uda
    WHERE uda.user_id = $${param}
      AND (t.device_id IS NULL OR t.device_id = uda.device_id)
      AND (t.vehicle_id IS NULL OR EXISTS (
        SELECT 1 FROM vehicles allowed_vehicle
        WHERE allowed_vehicle.vehicle_id = t.vehicle_id
          AND allowed_vehicle.device_id = uda.device_id
      ))
      AND (t.device_id IS NOT NULL OR t.vehicle_id IS NOT NULL)
  )`;

export const tripReadScopeParams = (actor: TripReadScope): number[] =>
  hasFullFleetTripAccess(actor) ? [] : [actor.userId];
