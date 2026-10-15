import { pool } from '@/infrastructure/database/pool';

/** Grant checks are evaluated against current SQL entitlements, not cached claims. */
export type AssetGrantReference =
  | 'vehicleRow'
  | 'vehicleId'
  | 'deviceId'
  | 'tripRow'
  | 'maintenanceRow';

const lookupSql: Record<AssetGrantReference, string> = {
  vehicleRow: `SELECT 1 FROM vehicles v
    JOIN user_device_access uda ON uda.device_id = v.device_id
    WHERE uda.user_id = $1 AND v.id = $2 LIMIT 1`,
  vehicleId: `SELECT 1 FROM vehicles v
    JOIN user_device_access uda ON uda.device_id = v.device_id
    WHERE uda.user_id = $1 AND v.vehicle_id = $2 LIMIT 1`,
  deviceId: `SELECT 1 FROM user_device_access uda
    WHERE uda.user_id = $1 AND uda.device_id = $2 LIMIT 1`,
  tripRow: `SELECT 1 FROM trips t
    JOIN user_device_access uda ON uda.user_id = $1 AND
      (uda.device_id = t.device_id OR EXISTS (
        SELECT 1 FROM vehicles v WHERE v.vehicle_id = t.vehicle_id
          AND v.device_id = uda.device_id
      ))
    WHERE t.id = $2 LIMIT 1`,
  maintenanceRow: `SELECT 1 FROM maintenance m
    JOIN vehicles v ON v.vehicle_id = m.vehicle_id
    JOIN user_device_access uda ON uda.device_id = v.device_id
    WHERE uda.user_id = $1 AND m.id = $2 LIMIT 1`,
};

export const hasAssetGrant = async (
  userId: number,
  reference: AssetGrantReference,
  value: string | number,
): Promise<boolean> => {
  const result = await pool.query(lookupSql[reference], [userId, value]);
  return (result.rowCount ?? result.rows.length) > 0;
};
