import { pool } from '@/infrastructure/database/pool';

export type DeviceCommandStatus = 'pending' | 'sent' | 'accepted' | 'acknowledged' | 'failed';

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
        actor_user_id,
        correlation_id
      )
      VALUES ($1, $2, $3::jsonb, 'pending', $4, $5)
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
  options?: { markAcknowledged?: boolean; expectedDeviceId?: string },
): Promise<DeviceCommandRecord | null> => {
  const result = await pool.query<DeviceCommandRow>(
    `UPDATE device_commands
     SET status = CASE
           WHEN status IN ('acknowledged', 'failed') THEN status
           WHEN status = 'accepted' AND $2::varchar IN ('pending', 'sent') THEN status
           WHEN status = 'sent' AND $2::varchar = 'pending' THEN status
           ELSE $2::varchar
         END,
         response = CASE
           WHEN status IN ('acknowledged', 'failed') THEN response
           WHEN status = 'accepted' AND $2::varchar IN ('pending', 'sent') THEN response
           WHEN status = 'sent' AND $2::varchar = 'pending' THEN response
           ELSE COALESCE($3, response)
         END,
         sent_at = CASE
            WHEN $2::varchar = 'sent' AND sent_at IS NULL THEN NOW()
            ELSE sent_at
          END,
         acked_at = CASE
            WHEN ($2::varchar = 'acknowledged' OR $4::boolean = TRUE) AND acked_at IS NULL THEN NOW()
            ELSE acked_at
          END,
          updated_at = NOW()
      WHERE id = $1
        AND ($5::varchar IS NULL OR device_id = $5::varchar)
      RETURNING id, device_id, command, params, status, sent_at, acked_at, response`,
    [
      id,
      status,
      response ?? null,
      options?.markAcknowledged ?? false,
      options?.expectedDeviceId ?? null,
    ],
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
       ORDER BY COALESCE(sent_at, created_at) DESC, id DESC
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
