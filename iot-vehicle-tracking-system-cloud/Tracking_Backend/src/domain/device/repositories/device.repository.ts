import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import { hashToken } from '@/shared/utils/crypto.util';
import {
  eventLogLiveMutationSql,
  eventLogPositionValueSql,
  eventLogTelemetryTimestampSql,
} from '@/shared/utils/event-log-telemetry-sql.util';
import type {
  Device,
  DeviceListQuery,
  DeviceAccessScope,
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

const ALERT_SOURCE_EXPR = `COALESCE(
  a.source::text,
  CASE
    WHEN a.title LIKE 'OBD:%'
      OR COALESCE(a.message, '') ILIKE '%dtc%'
      OR COALESCE(a.message, '') ILIKE '%ecu%'
      OR COALESCE(a.message, '') ILIKE '%MIL%'
    THEN 'ecu'
    ELSE 'device'
  END
)`;

const ALERT_SEVERITY_RANK_EXPR = `CASE a.severity
  WHEN 'critical' THEN 4
  WHEN 'high' THEN 3
  WHEN 'medium' THEN 2
  WHEN 'low' THEN 1
  ELSE 0
END`;

const ALERT_SUMMARY_LATERAL = `LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE a.status = 'active' AND ${ALERT_SOURCE_EXPR} = 'device')::int AS device_alert_count,
    ARRAY_AGG(a.title ORDER BY a.created_at DESC)
      FILTER (WHERE a.status = 'active' AND ${ALERT_SOURCE_EXPR} = 'device' AND a.title IS NOT NULL)
      AS device_alert_titles,
    CASE MAX(CASE
      WHEN a.status = 'active' AND ${ALERT_SOURCE_EXPR} = 'device' THEN ${ALERT_SEVERITY_RANK_EXPR}
      ELSE 0
    END)
      WHEN 4 THEN 'critical'
      WHEN 3 THEN 'high'
      WHEN 2 THEN 'medium'
      WHEN 1 THEN 'low'
      ELSE 'none'
    END AS device_alert_highest_severity,
    COUNT(*) FILTER (WHERE a.status = 'active' AND ${ALERT_SOURCE_EXPR} = 'ecu')::int AS ecu_alert_count,
    ARRAY_AGG(a.title ORDER BY a.created_at DESC)
      FILTER (WHERE a.status = 'active' AND ${ALERT_SOURCE_EXPR} = 'ecu' AND a.title IS NOT NULL)
      AS ecu_alert_titles,
    CASE MAX(CASE
      WHEN a.status = 'active' AND ${ALERT_SOURCE_EXPR} = 'ecu' THEN ${ALERT_SEVERITY_RANK_EXPR}
      ELSE 0
    END)
      WHEN 4 THEN 'critical'
      WHEN 3 THEN 'high'
      WHEN 2 THEN 'medium'
      WHEN 1 THEN 'low'
      ELSE 'none'
    END AS ecu_alert_highest_severity
  FROM alerts a
  WHERE a.device_id = d.device_id
) alerts ON true`;

const EVENT_CONTEXT_SPEED_EXPR = `(${eventLogPositionValueSql('speed', 'el')})::float8`;

const EVENT_CONTEXT_COURSE_EXPR = `(${eventLogPositionValueSql('course', 'el')})::float8`;

const EVENT_CONTEXT_DEVICE_BATTERY_EXPR = `COALESCE(
  NULLIF(el.context#>>'{raw_payload,data,device_battery}', '')::float8,
  NULLIF(el.context->>'device_battery', '')::float8
)`;

const EVENT_CONTEXT_VEHICLE_BATTERY_EXPR = `COALESCE(
  NULLIF(el.context#>>'{raw_payload,data,vehicle_battery}', '')::float8,
  NULLIF(el.context->>'vehicle_battery', '')::float8
)`;

const EVENT_CONTEXT_SATELLITES_EXPR = `COALESCE(
  NULLIF(el.context#>>'{raw_payload,data,satellites}', '')::int,
  NULLIF(el.context->>'satellites', '')::int
)`;

const EVENT_CONTEXT_IMU_DELTA_EXPR = `COALESCE(
  NULLIF(el.context#>>'{raw_payload,data,imu_accel_delta_mps2}', '')::float8,
  NULLIF(el.context->>'imu_accel_delta_mps2', '')::float8,
  NULLIF(el.context->>'vibration', '')::float8
)`;

const EVENT_CONTEXT_ERROR_CODE_EXPR = `COALESCE(
  NULLIF(el.context#>>'{raw_payload,data,error_code}', '')::int,
  NULLIF(el.context->>'error_code', '')::int,
  d.last_error_code
)`;

const EVENT_CONTEXT_TEMPERATURE_EXPR = `COALESCE(
  NULLIF(el.context->>'temperature', '')::float8,
  NULLIF(el.context#>>'{raw_payload,diagnostics,signals,coolant_c}', '')::float8,
  NULLIF(el.context#>>'{diagnostics,signals,coolant_c}', '')::float8,
  NULLIF(el.context#>>'{raw_payload,diagnostics,signals,intake_air_temp_c}', '')::float8,
  NULLIF(el.context#>>'{diagnostics,signals,intake_air_temp_c}', '')::float8
)`;

const EVENT_CONTEXT_ENGINE_TEMPERATURE_EXPR = `COALESCE(
  NULLIF(el.context#>>'{raw_payload,diagnostics,signals,coolant_c}', '')::float8,
  NULLIF(el.context#>>'{diagnostics,signals,coolant_c}', '')::float8,
  NULLIF(el.context->>'temperature', '')::float8
)`;

const EVENT_CONTEXT_RPM_EXPR = `COALESCE(
  NULLIF(el.context#>>'{raw_payload,diagnostics,signals,rpm}', '')::float8,
  NULLIF(el.context#>>'{diagnostics,signals,rpm}', '')::float8
)`;

const EVENT_CONTEXT_EXISTS_CONDITION = `(context ?| ARRAY[
  'speed',
  'course',
  'vehicle_battery',
  'device_battery',
  'satellites',
  'imu_accel_delta_mps2',
  'vibration',
  'error_code',
  'temperature',
  'diagnostics',
  'raw_payload'
])`;

const isMissingColumnError = (error: unknown): boolean =>
  typeof error === 'object'
  && error !== null
  && 'code' in error
  && error.code === '42703';

const GLOBAL_DEVICE_ACCESS_ROLES = new Set(['root', 'admin']);

const appendDeviceAccessCondition = (
  conditions: string[],
  params: unknown[],
  paramIndex: number,
  accessScope?: DeviceAccessScope,
): number => {
  if (
    !accessScope ||
    GLOBAL_DEVICE_ACCESS_ROLES.has(accessScope.role ?? '') ||
    accessScope.deviceAccessMode === 'all'
  ) {
    return paramIndex;
  }

  if (!accessScope.userId) {
    conditions.push('FALSE');
    return paramIndex;
  }

  conditions.push(`EXISTS (
    SELECT 1
    FROM user_device_access uda
    WHERE uda.user_id = $${paramIndex}
      AND uda.device_id = d.device_id
  )`);
  params.push(accessScope.userId);
  return paramIndex + 1;
};

export const findAll = async (
  query: DeviceListQuery,
  accessScope?: DeviceAccessScope,
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
    conditions.push(`(
      d.device_id ILIKE $${paramIndex}
      OR d.device_name ILIKE $${paramIndex}
      OR COALESCE(d.vehicle_id, '') ILIKE $${paramIndex}
      OR COALESCE(link.linked_vehicle_id, '') ILIKE $${paramIndex}
      OR COALESCE(link.vehicle_plate, '') ILIKE $${paramIndex}
      OR COALESCE(link.customer_name, '') ILIKE $${paramIndex}
    )`);
    params.push(`%${query.search}%`);
    paramIndex++;
  }

  paramIndex = appendDeviceAccessCondition(conditions, params, paramIndex, accessScope);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countJoinClause = query.search ? DEVICE_LINK_LATERAL : '';

  const sortColumn = ALLOWED_SORT_COLUMNS[query.sortBy ?? ''] ?? 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY d.${sortColumn} ${sortOrder}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM devices d ${countJoinClause} ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const devices = await findMany<Device>(
    `SELECT
        d.*,
        COALESCE(d.last_latitude, d.latitude) AS latitude,
        COALESCE(d.last_longitude, d.longitude) AS longitude,
        COALESCE(alerts.device_alert_count, 0) AS device_alert_count,
        COALESCE(alerts.device_alert_titles, ARRAY[]::text[]) AS device_alert_titles,
        COALESCE(alerts.device_alert_highest_severity, 'none') AS device_alert_highest_severity,
        COALESCE(alerts.ecu_alert_count, 0) AS ecu_alert_count,
        COALESCE(alerts.ecu_alert_titles, ARRAY[]::text[]) AS ecu_alert_titles,
        COALESCE(alerts.ecu_alert_highest_severity, 'none') AS ecu_alert_highest_severity,
        link.vehicle_plate,
        link.customer_name,
        link.linked_vehicle_id
     FROM devices d
     ${DEVICE_LINK_LATERAL}
     ${ALERT_SUMMARY_LATERAL}
     ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { devices, total };
};

export const hasAssignedAccessByDeviceId = async (
  userId: number,
  deviceId: string,
): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1
     FROM user_device_access
     WHERE user_id = $1 AND device_id = $2
     LIMIT 1`,
    [userId, deviceId],
  );
  return (result.rowCount ?? 0) > 0;
};

export const hasAssignedAccessByReference = async (
  userId: number,
  rawId: string,
): Promise<boolean> => {
  const parsedId = Number.parseInt(rawId, 10);
  const useInternalId = !Number.isNaN(parsedId);
  const result = await pool.query(
    `SELECT 1
     FROM devices d
     JOIN user_device_access uda ON uda.device_id = d.device_id
     WHERE uda.user_id = $1
       AND ${useInternalId ? 'd.id = $2' : 'd.device_id = $2'}
     LIMIT 1`,
    [userId, useInternalId ? parsedId : rawId],
  );
  return (result.rowCount ?? 0) > 0;
};

export const findById = async (id: number): Promise<Device | null> =>
  findOne<Device>(
    `SELECT
        d.*,
        COALESCE(d.last_latitude, d.latitude) AS latitude,
        COALESCE(d.last_longitude, d.longitude) AS longitude,
        COALESCE(alerts.device_alert_count, 0) AS device_alert_count,
        COALESCE(alerts.device_alert_titles, ARRAY[]::text[]) AS device_alert_titles,
        COALESCE(alerts.device_alert_highest_severity, 'none') AS device_alert_highest_severity,
        COALESCE(alerts.ecu_alert_count, 0) AS ecu_alert_count,
        COALESCE(alerts.ecu_alert_titles, ARRAY[]::text[]) AS ecu_alert_titles,
        COALESCE(alerts.ecu_alert_highest_severity, 'none') AS ecu_alert_highest_severity,
        link.vehicle_plate,
        link.customer_name,
        link.linked_vehicle_id
     FROM devices d
     ${DEVICE_LINK_LATERAL}
     ${ALERT_SUMMARY_LATERAL}
     WHERE d.id = $1`,
    [id],
  );

export const findByDeviceId = async (deviceId: string): Promise<Device | null> =>
  findOne<Device>(
    `SELECT
        d.*,
        COALESCE(d.last_latitude, d.latitude) AS latitude,
        COALESCE(d.last_longitude, d.longitude) AS longitude,
        COALESCE(alerts.device_alert_count, 0) AS device_alert_count,
        COALESCE(alerts.device_alert_titles, ARRAY[]::text[]) AS device_alert_titles,
        COALESCE(alerts.device_alert_highest_severity, 'none') AS device_alert_highest_severity,
        COALESCE(alerts.ecu_alert_count, 0) AS ecu_alert_count,
        COALESCE(alerts.ecu_alert_titles, ARRAY[]::text[]) AS ecu_alert_titles,
        COALESCE(alerts.ecu_alert_highest_severity, 'none') AS ecu_alert_highest_severity,
        link.vehicle_plate,
        link.customer_name,
        link.linked_vehicle_id
     FROM devices d
     ${DEVICE_LINK_LATERAL}
     ${ALERT_SUMMARY_LATERAL}
     WHERE d.device_id = $1`,
    [deviceId],
  );

export const create = async (input: CreateDeviceInput, authToken: string): Promise<Device> => {
  const hashedAuthToken = hashToken(authToken);
  const imuAccelDeltaThresholdMps2 =
    input.imuAccelDeltaThresholdMps2 ?? input.vibrationThreshold ?? 2.0;

  const params = [
    input.deviceId,
    input.deviceName,
    hashedAuthToken,
    input.imei ?? null,
    imuAccelDeltaThresholdMps2,
    input.requestInterval ?? 10,
    input.config ? JSON.stringify(input.config) : null,
  ];

  try {
    return await insertOne<Device>(
      `INSERT INTO devices (device_id, device_name, auth_token, imei, imu_accel_delta_threshold_mps2, request_interval, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      params,
    );
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }
  }

  return insertOne<Device>(
    `INSERT INTO devices (device_id, device_name, auth_token, imei, vibration_threshold, request_interval, config, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    params,
  );
};

export const update = async (id: number, input: UpdateDeviceInput): Promise<Device | null> => {
  const imuAccelDeltaThresholdMps2 =
    input.imuAccelDeltaThresholdMps2 ?? input.vibrationThreshold;

  const buildUpdateQuery = (thresholdColumn: 'imu_accel_delta_threshold_mps2' | 'vibration_threshold') => {
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
    if (imuAccelDeltaThresholdMps2 !== undefined) {
      setClauses.push(`${thresholdColumn} = $${paramIndex++}`);
      values.push(imuAccelDeltaThresholdMps2);
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

    if (setClauses.length === 0) {
      return null;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    return {
      query: `UPDATE devices SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    };
  };

  const canonicalUpdate = buildUpdateQuery('imu_accel_delta_threshold_mps2');
  if (canonicalUpdate === null) {
    return findById(id);
  }

  try {
    return await updateOne<Device>(canonicalUpdate.query, canonicalUpdate.values);
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }
  }

  const legacyUpdate = buildUpdateQuery('vibration_threshold');
  return updateOne<Device>(
    legacyUpdate?.query ?? '',
    legacyUpdate?.values,
  );
};

export const updateAuthToken = async (id: number, authToken: string): Promise<Device | null> =>
  updateOne<Device>(
    'UPDATE devices SET auth_token = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [authToken, id],
  );

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM devices WHERE id = $1', [id]);

export const findAllPositions = async (
  accessScope?: DeviceAccessScope,
): Promise<DevicePosition[]> => {
  const conditions = [
    'COALESCE(d.last_latitude, d.latitude) IS NOT NULL',
    'COALESCE(d.last_longitude, d.longitude) IS NOT NULL',
    'ABS(COALESCE(d.last_latitude, d.latitude)) <= 90',
    'ABS(COALESCE(d.last_longitude, d.longitude)) <= 180',
    `NOT (
      COALESCE(d.last_latitude, d.latitude) = 0
      AND COALESCE(d.last_longitude, d.longitude) = 0
    )`,
  ];
  const params: unknown[] = [];
  appendDeviceAccessCondition(conditions, params, 1, accessScope);

  const result = await pool.query<{
    device_id: string;
    device_name: string;
    linked_vehicle_id: string | null;
    vehicle_plate: string | null;
    customer_name: string | null;
    latitude: number;
    longitude: number;
    current_status: string;
    ignition_state: Device['ignition_state'];
    motion_state: Device['motion_state'];
    vehicle_state: Device['vehicle_state'];
    device_state: Device['device_state'];
    sleep_mode: Device['sleep_mode'];
    state_updated_at: Date | null;
    last_seen_at: Date | null;
    speed: number | null;
    course: number | null;
    device_battery: number | null;
    vehicle_battery: number | null;
    satellites: number | null;
    imu_accel_delta_mps2: number | null;
    error_code: number | null;
    temperature: number | null;
    engine_temperature: number | null;
    rpm: number | null;
    device_alert_count: number | null;
    device_alert_titles: string[] | null;
    device_alert_highest_severity: Device['device_alert_highest_severity'];
    ecu_alert_count: number | null;
    ecu_alert_titles: string[] | null;
    ecu_alert_highest_severity: Device['ecu_alert_highest_severity'];
  }>(
    `SELECT
       d.device_id,
       d.device_name,
       link.linked_vehicle_id,
       link.vehicle_plate,
       link.customer_name,
       COALESCE(d.last_latitude, d.latitude) AS latitude,
       COALESCE(d.last_longitude, d.longitude) AS longitude,
       d.current_status,
       d.ignition_state,
       d.motion_state,
       d.vehicle_state,
       d.device_state,
       d.sleep_mode,
       d.state_updated_at,
       d.last_seen_at,
       COALESCE(
         d.last_speed,
         ${EVENT_CONTEXT_SPEED_EXPR}
       ) AS speed,
       ${EVENT_CONTEXT_COURSE_EXPR} AS course,
       ${EVENT_CONTEXT_DEVICE_BATTERY_EXPR} AS device_battery,
       ${EVENT_CONTEXT_VEHICLE_BATTERY_EXPR} AS vehicle_battery,
       ${EVENT_CONTEXT_SATELLITES_EXPR} AS satellites,
       ${EVENT_CONTEXT_IMU_DELTA_EXPR} AS imu_accel_delta_mps2,
       ${EVENT_CONTEXT_ERROR_CODE_EXPR} AS error_code,
       ${EVENT_CONTEXT_TEMPERATURE_EXPR} AS temperature,
       ${EVENT_CONTEXT_ENGINE_TEMPERATURE_EXPR} AS engine_temperature,
       ${EVENT_CONTEXT_RPM_EXPR} AS rpm,
       COALESCE(alerts.device_alert_count, 0) AS device_alert_count,
       COALESCE(alerts.device_alert_titles, ARRAY[]::text[]) AS device_alert_titles,
       COALESCE(alerts.device_alert_highest_severity, 'none') AS device_alert_highest_severity,
       COALESCE(alerts.ecu_alert_count, 0) AS ecu_alert_count,
       COALESCE(alerts.ecu_alert_titles, ARRAY[]::text[]) AS ecu_alert_titles,
       COALESCE(alerts.ecu_alert_highest_severity, 'none') AS ecu_alert_highest_severity
     FROM devices d
     ${DEVICE_LINK_LATERAL}
     LEFT JOIN LATERAL (
       SELECT context
       FROM event_logs
       WHERE device_id = d.device_id
         AND ${eventLogLiveMutationSql()}
         AND ${EVENT_CONTEXT_EXISTS_CONDITION}
       ORDER BY ${eventLogTelemetryTimestampSql()} DESC, server_timestamp DESC, id DESC
       LIMIT 1
     ) el ON true
     ${ALERT_SUMMARY_LATERAL}
      WHERE ${conditions.join(' AND ')}`,
    params,
  );

  return result.rows.map((row) => ({
    deviceId: row.device_id,
    deviceName: row.device_name,
    vehicleId: row.linked_vehicle_id,
    vehiclePlate: row.vehicle_plate,
    customerName: row.customer_name,
    latitude: row.latitude,
    longitude: row.longitude,
    currentStatus: row.current_status,
    ignitionState: row.ignition_state,
    motionState: row.motion_state,
    vehicleState: row.vehicle_state,
    deviceState: row.device_state,
    sleepMode: row.sleep_mode,
    stateUpdatedAt: row.state_updated_at?.toISOString() ?? null,
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
    speed: row.speed,
    course: row.course,
    deviceBattery: row.device_battery,
    vehicleBattery: row.vehicle_battery,
    satellites: row.satellites,
    imuAccelDeltaMps2: row.imu_accel_delta_mps2,
    errorCode: row.error_code,
    temperature: row.temperature,
    engineTemperature: row.engine_temperature,
    rpm: row.rpm,
    activeAlertCount: (row.device_alert_count ?? 0) + (row.ecu_alert_count ?? 0),
    activeAlertTitles: [...(row.device_alert_titles ?? []), ...(row.ecu_alert_titles ?? [])],
    deviceAlerts: {
      source: 'device',
      count: row.device_alert_count ?? 0,
      highestSeverity: row.device_alert_highest_severity ?? 'none',
      titles: row.device_alert_titles ?? [],
    },
    ecuAlerts: {
      source: 'ecu',
      count: row.ecu_alert_count ?? 0,
      highestSeverity: row.ecu_alert_highest_severity ?? 'none',
      titles: row.ecu_alert_titles ?? [],
    },
  }));
};
