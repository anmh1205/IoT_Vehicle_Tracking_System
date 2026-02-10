import { findOne, findMany, insertOne, updateOne, deleteOne } from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import { generateToken } from '@/shared/utils/crypto.util';
import type { Device, DeviceListQuery, CreateDeviceInput, UpdateDeviceInput, DevicePosition } from '@/domain/device/types/device.types';

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
    conditions.push(`current_status = $${paramIndex++}`);
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
    `SELECT * FROM devices ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { devices, total };
};

export const findById = async (id: number): Promise<Device | null> =>
  findOne<Device>(
    'SELECT * FROM devices WHERE id = $1',
    [id],
  );

export const findByDeviceId = async (deviceId: string): Promise<Device | null> =>
  findOne<Device>(
    'SELECT * FROM devices WHERE device_id = $1',
    [deviceId],
  );

export const create = async (input: CreateDeviceInput): Promise<Device> => {
  const authToken = generateToken();

  return insertOne<Device>(
    `INSERT INTO devices (device_id, device_name, auth_token, imei, vibration_threshold, request_interval, config, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      input.deviceId,
      input.deviceName,
      authToken,
      input.imei ?? null,
      input.vibrationThreshold ?? 2.0,
      input.requestInterval ?? 10,
      input.config ? JSON.stringify(input.config) : null,
    ],
  );
};

export const update = async (
  id: number,
  input: UpdateDeviceInput,
): Promise<Device | null> => {
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
  const rows = await findMany<Device>(
    `SELECT device_id, device_name, latitude, longitude, current_status, last_seen_at
     FROM devices
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL`,
  );

  return rows.map((row) => ({
    deviceId: row.device_id,
    deviceName: row.device_name,
    latitude: row.latitude!,
    longitude: row.longitude!,
    currentStatus: row.current_status,
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
  }));
};
