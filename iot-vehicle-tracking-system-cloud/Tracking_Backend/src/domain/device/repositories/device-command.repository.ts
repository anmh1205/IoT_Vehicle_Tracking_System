import { pool } from '@/infrastructure/database/pool';

export type DeviceCommandStatus = 'pending' | 'sent' | 'acknowledged' | 'failed';

export interface DeviceCommandRecord {
  id: number;
  deviceId: string;
  command: string;
  params: Record<string, unknown>;
  status: DeviceCommandStatus;
  sentAt: string | null;
  ackedAt: string | null;
  response: string | null;
}

interface DeviceCommandRow {
  id: string | number;
  device_id: string;
  command: string;
  params: Record<string, unknown> | null;
  status: DeviceCommandStatus;
  sent_at: Date | null;
  acked_at: Date | null;
  response: string | null;
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const mapRow = (row: DeviceCommandRow): DeviceCommandRecord => ({
  id: Number(row.id),
  deviceId: row.device_id,
  command: row.command,
  params: toRecord(row.params),
  status: row.status,
  sentAt: row.sent_at?.toISOString() ?? null,
  ackedAt: row.acked_at?.toISOString() ?? null,
  response: row.response,
});

export const createCommand = async (input: {
  deviceId: string;
  command: string;
  params?: Record<string, unknown>;
  actorUserId?: number;
  correlationId?: string;
}): Promise<DeviceCommandRecord> => {
  const result = await pool.query<DeviceCommandRow>(
    `INSERT INTO device_commands (
        device_id,
        command,
        params,
        status,
        sent_at,
        actor_user_id,
        correlation_id
      )
      VALUES ($1, $2, $3::jsonb, 'pending', NOW(), $4, $5)
      RETURNING id, device_id, command, params, status, sent_at, acked_at, response`,
    [
      input.deviceId,
      input.command,
      JSON.stringify(input.params ?? {}),
      input.actorUserId ?? null,
      input.correlationId ?? null,
    ],
  );

  return mapRow(result.rows[0]);
};

export const updateCommandStatus = async (
  id: number,
  status: DeviceCommandStatus,
  response?: string | null,
): Promise<DeviceCommandRecord | null> => {
  const result = await pool.query<DeviceCommandRow>(
    `UPDATE device_commands
     SET status = $2::varchar,
         response = COALESCE($3, response),
         acked_at = CASE
           WHEN $2::varchar = 'acknowledged' AND acked_at IS NULL THEN NOW()
           ELSE acked_at
         END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, device_id, command, params, status, sent_at, acked_at, response`,
    [id, status, response ?? null],
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

export const listDeviceCommands = async (deviceId: string, page: number, limit: number) => {
  const offset = Math.max(page - 1, 0) * limit;

  const [countResult, rowsResult] = await Promise.all([
    pool.query<{ total: string }>('SELECT COUNT(*) AS total FROM device_commands WHERE device_id = $1', [
      deviceId,
    ]),
    pool.query<DeviceCommandRow>(
      `SELECT id, device_id, command, params, status, sent_at, acked_at, response
       FROM device_commands
       WHERE device_id = $1
       ORDER BY sent_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [deviceId, limit, offset],
    ),
  ]);

  const total = Number.parseInt(countResult.rows[0]?.total ?? '0', 10);

  return {
    items: rowsResult.rows.map(mapRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / Math.max(limit, 1)), 1),
    },
  };
};
