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
    conditions.push(`current_status::text = $${paramIndex++}`);
    params.push(query.status);
  }

  if (query.search) {
    conditions.push(`(device_id ILIKE $${paramIndex} OR device_name ILIKE $${paramIndex})`);
    params.push(`%${query.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortColumn = ALLOWED_SORT_COLUMNS[query.sortBy ?? ''] ?? 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY ${sortColumn} ${sortOrder}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM devices ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const devices = await findMany<Device>(
    `SELECT *,
        COALESCE(last_latitude, latitude) AS latitude,
        COALESCE(last_longitude, longitude) AS longitude
     FROM devices ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { devices, total };
};

export const findById = async (id: number): Promise<Device | null> =>
  findOne<Device>(
    `SELECT *,
        COALESCE(last_latitude, latitude) AS latitude,
        COALESCE(last_longitude, longitude) AS longitude
     FROM devices
     WHERE id = $1`,
    [id],
  );

export const findByDeviceId = async (deviceId: string): Promise<Device | null> =>
  findOne<Device>(
    `SELECT *,
        COALESCE(last_latitude, latitude) AS latitude,
        COALESCE(last_longitude, longitude) AS longitude
     FROM devices
     WHERE device_id = $1`,
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
    latitude: number;
    longitude: number;
    current_status: string;
    last_seen_at: Date | null;
    speed: number | null;
    heading: number | null;
    battery: number | null;
    vibration: number | null;
    temperature: number | null;
  }>(
    `SELECT
       d.device_id,
       d.device_name,
       v.plate_number AS vehicle_plate,
       COALESCE(d.last_latitude, d.latitude) AS latitude,
       COALESCE(d.last_longitude, d.longitude) AS longitude,
       d.current_status,
       d.last_seen_at,
       COALESCE(
         NULLIF(el.context->>'speed', '')::float8,
         NULLIF(el.context->>'spd', '')::float8,
         0
       ) AS speed,
       COALESCE(NULLIF(el.context->>'heading', '')::float8, 0) AS heading,
       COALESCE(
         NULLIF(el.context->>'battery_top', '')::float8,
         NULLIF(el.context->>'battery', '')::float8,
         NULLIF(el.context->>'batt', '')::float8,
         0
       ) AS battery,
       COALESCE(
         NULLIF(el.context->>'vibration', '')::float8,
         NULLIF(el.context->>'vib', '')::float8,
         0
       ) AS vibration,
       COALESCE(
         NULLIF(el.context->>'temperature', '')::float8,
         NULLIF(el.context->>'temp', '')::float8,
         0
       ) AS temperature
     FROM devices d
     LEFT JOIN vehicles v ON v.device_id = d.device_id
     LEFT JOIN LATERAL (
       SELECT context
       FROM event_logs
       WHERE event_logs.device_id = d.device_id
         AND (
           event_logs.event_type::text IN ('rawdata', 'raw_data', 'telemetry', 'device_data')
           OR event_logs.context ? 'speed'
           OR event_logs.context ? 'spd'
           OR event_logs.context ? 'battery'
           OR event_logs.context ? 'battery_top'
           OR event_logs.context ? 'batt'
           OR event_logs.context ? 'temperature'
           OR event_logs.context ? 'temp'
         )
       ORDER BY server_timestamp DESC
       LIMIT 1
     ) el ON true
     ORDER BY d.device_id`,
  );

  return result.rows.map((row) => ({
    deviceId: row.device_id,
    deviceName: row.device_name,
    vehiclePlate: row.vehicle_plate,
    latitude: row.latitude,
    longitude: row.longitude,
    currentStatus: row.current_status,
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
    speed: row.speed ?? 0,
    heading: row.heading ?? 0,
    battery: row.battery ?? 0,
    vibration: row.vibration ?? 0,
    temperature: row.temperature ?? 0,
  }));
};
