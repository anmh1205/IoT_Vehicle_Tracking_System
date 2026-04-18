import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import { hashToken } from '@/shared/utils/crypto.util';
import type {
  Device,
  DeviceListQuery,
  CreateDeviceInput,
  UpdateDeviceInput,
  DevicePosition,
} from '@/domain/device/types/device.types';

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  deviceId: 'device_id',
  deviceName: 'device_name',
  currentStatus: 'current_status',
  lastSeenAt: 'last_seen_at',
  createdAt: 'created_at',
};

const DEVICE_LINK_LATERAL = `LEFT JOIN LATERAL (
  SELECT
    v.plate_number AS vehicle_plate,
    c.name AS customer_name,
    v.vehicle_id AS linked_vehicle_id
  FROM vehicles v
  LEFT JOIN customers c ON c.id = v.customer_id
  WHERE v.device_id = d.device_id OR (d.vehicle_id IS NOT NULL AND v.vehicle_id = d.vehicle_id)
  ORDER BY CASE WHEN v.device_id = d.device_id THEN 0 ELSE 1 END, v.updated_at DESC, v.id DESC
  LIMIT 1
) link ON true`;

export const findAll = async (
  query: DeviceListQuery,
): Promise<{ devices: Device[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.status) {
    conditions.push(`d.current_status::text = $${paramIndex++}`);
    params.push(query.status);
  }

  if (query.search) {
    conditions.push(`(d.device_id ILIKE $${paramIndex} OR d.device_name ILIKE $${paramIndex})`);
    params.push(`%${query.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortColumn = ALLOWED_SORT_COLUMNS[query.sortBy ?? ''] ?? 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY d.${sortColumn} ${sortOrder}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM devices d ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const devices = await findMany<Device>(
    `SELECT
        d.*,
        COALESCE(d.last_latitude, d.latitude) AS latitude,
        COALESCE(d.last_longitude, d.longitude) AS longitude,
        link.vehicle_plate,
        link.customer_name,
        link.linked_vehicle_id
     FROM devices d
     ${DEVICE_LINK_LATERAL}
     ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { devices, total };
};

export const findById = async (id: number): Promise<Device | null> =>
  findOne<Device>(
    `SELECT
        d.*,
        COALESCE(d.last_latitude, d.latitude) AS latitude,
        COALESCE(d.last_longitude, d.longitude) AS longitude,
        link.vehicle_plate,
        link.customer_name,
        link.linked_vehicle_id
     FROM devices d
     ${DEVICE_LINK_LATERAL}
     WHERE d.id = $1`,
    [id],
  );

export const findByDeviceId = async (deviceId: string): Promise<Device | null> =>
  findOne<Device>(
    `SELECT
        d.*,
        COALESCE(d.last_latitude, d.latitude) AS latitude,
        COALESCE(d.last_longitude, d.longitude) AS longitude,
        link.vehicle_plate,
        link.customer_name,
        link.linked_vehicle_id
     FROM devices d
     ${DEVICE_LINK_LATERAL}
     WHERE d.device_id = $1`,
    [deviceId],
  );

export const create = async (input: CreateDeviceInput, authToken: string): Promise<Device> => {
  const hashedAuthToken = hashToken(authToken);

  return insertOne<Device>(
    `INSERT INTO devices (device_id, device_name, auth_token, imei, vibration_threshold, request_interval, config, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      input.deviceId,
      input.deviceName,
      hashedAuthToken,
      input.imei ?? null,
      input.vibrationThreshold ?? 2.0,
      input.requestInterval ?? 10,
      input.config ? JSON.stringify(input.config) : null,
    ],
  );
};

export const update = async (id: number, input: UpdateDeviceInput): Promise<Device | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.deviceName !== undefined) {
    setClauses.push(`device_name = $${paramIndex++}`);
    values.push(input.deviceName);
  }
  if (input.imei !== undefined) {
    setClauses.push(`imei = $${paramIndex++}`);
    values.push(input.imei);
  }
  if (input.vibrationThreshold !== undefined) {
    setClauses.push(`vibration_threshold = $${paramIndex++}`);
    values.push(input.vibrationThreshold);
  }
  if (input.requestInterval !== undefined) {
    setClauses.push(`request_interval = $${paramIndex++}`);
    values.push(input.requestInterval);
  }
  if (input.targetFirmwareVersion !== undefined) {
    setClauses.push(`target_firmware_version = $${paramIndex++}`);
    values.push(input.targetFirmwareVersion);
  }
  if (input.config !== undefined) {
    setClauses.push(`config = $${paramIndex++}`);
    values.push(JSON.stringify(input.config));
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  return updateOne<Device>(
    `UPDATE devices SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
};

export const updateAuthToken = async (id: number, authToken: string): Promise<Device | null> =>
  updateOne<Device>(
    'UPDATE devices SET auth_token = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [authToken, id],
  );

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM devices WHERE id = $1', [id]);

export const findAllPositions = async (): Promise<DevicePosition[]> => {
  const result = await pool.query<{
    device_id: string;
    device_name: string;
    vehicle_plate: string | null;
    customer_name: string | null;
    latitude: number;
    longitude: number;
    current_status: string;
    last_seen_at: Date | null;
    speed: number | null;
    heading: number | null;
    battery: number | null;
    device_battery: number | null;
    vehicle_battery: number | null;
    vibration: number | null;
    temperature: number | null;
    engine_temperature: number | null;
    rpm: number | null;
    active_alert_count: number | null;
    active_alert_titles: string[] | null;
  }>(
    `SELECT
       d.device_id,
       d.device_name,
       link.vehicle_plate,
       link.customer_name,
       COALESCE(d.last_latitude, d.latitude) AS latitude,
       COALESCE(d.last_longitude, d.longitude) AS longitude,
       d.current_status,
       d.last_seen_at,
       COALESCE(
         d.last_speed,
         NULLIF(el.context->>'spd', '')::float8,
         NULLIF(el.context->>'speed', '')::float8,
         0
       ) AS speed,
       COALESCE(
         NULLIF(el.context->>'heading', '')::float8,
         NULLIF(el.context->>'course', '')::float8,
         0
       ) AS heading,
       COALESCE(
         NULLIF(el.context->>'batt', '')::float8,
         NULLIF(el.context->>'bt', '')::float8,
         NULLIF(el.context->>'battery_top', '')::float8,
         0
       ) AS battery,
       COALESCE(
         NULLIF(el.context->>'bb', '')::float8,
         NULLIF(el.context->>'battery_bot', '')::float8,
         0
       ) AS device_battery,
       COALESCE(
         NULLIF(el.context->>'bt', '')::float8,
         NULLIF(el.context->>'batt', '')::float8,
         NULLIF(el.context->>'battery_top', '')::float8,
         0
       ) AS vehicle_battery,
       COALESCE(
         NULLIF(el.context->>'vib', '')::float8,
         NULLIF(el.context->>'vibration', '')::float8,
         0
       ) AS vibration,
       COALESCE(
         NULLIF(el.context->>'temp', '')::float8,
         NULLIF(el.context->>'temperature', '')::float8,
         NULLIF(el.context#>>'{diagnostics,signals,coolant_c}', '')::float8,
         NULLIF(el.context#>>'{diagnostics,signals,intake_air_temp_c}', '')::float8,
         0
       ) AS temperature,
       COALESCE(
         NULLIF(el.context#>>'{diagnostics,signals,coolant_c}', '')::float8,
         NULLIF(el.context->>'temp', '')::float8,
         NULLIF(el.context->>'temperature', '')::float8,
         0
       ) AS engine_temperature,
       COALESCE(
         NULLIF(el.context#>>'{diagnostics,signals,rpm}', '')::float8,
         0
       ) AS rpm,
       COALESCE(alerts.active_alert_count, 0) AS active_alert_count,
       COALESCE(alerts.active_alert_titles, ARRAY[]::text[]) AS active_alert_titles
     FROM devices d
     ${DEVICE_LINK_LATERAL}
     LEFT JOIN LATERAL (
       SELECT context
       FROM event_logs
       WHERE device_id = d.device_id
         AND context ?| ARRAY[
           'spd',
           'speed',
           'heading',
           'course',
           'batt',
           'bt',
           'battery_top',
           'vib',
           'vibration',
           'temp',
           'temperature',
           'diagnostics'
         ]
       ORDER BY server_timestamp DESC
       LIMIT 1
     ) el ON true
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS active_alert_count,
         ARRAY_AGG(a.title ORDER BY a.created_at DESC) FILTER (WHERE a.title IS NOT NULL) AS active_alert_titles
       FROM alerts a
       WHERE a.device_id = d.device_id
         AND a.status = 'active'
     ) alerts ON true
     WHERE COALESCE(d.last_latitude, d.latitude) IS NOT NULL
       AND COALESCE(d.last_longitude, d.longitude) IS NOT NULL
       AND ABS(COALESCE(d.last_latitude, d.latitude)) <= 90
       AND ABS(COALESCE(d.last_longitude, d.longitude)) <= 180
       AND NOT (
         COALESCE(d.last_latitude, d.latitude) = 0
         AND COALESCE(d.last_longitude, d.longitude) = 0
       )`,
  );

  return result.rows.map((row) => ({
    deviceId: row.device_id,
    deviceName: row.device_name,
    vehiclePlate: row.vehicle_plate,
    customerName: row.customer_name,
    latitude: row.latitude,
    longitude: row.longitude,
    currentStatus: row.current_status,
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
    speed: row.speed ?? 0,
    heading: row.heading ?? 0,
    battery: row.battery ?? 0,
    deviceBattery: row.device_battery,
    vehicleBattery: row.vehicle_battery,
    vibration: row.vibration ?? 0,
    temperature: row.temperature ?? 0,
    engineTemperature: row.engine_temperature,
    rpm: row.rpm,
    activeAlertCount: row.active_alert_count ?? 0,
    activeAlertTitles: row.active_alert_titles ?? [],
  }));
};
