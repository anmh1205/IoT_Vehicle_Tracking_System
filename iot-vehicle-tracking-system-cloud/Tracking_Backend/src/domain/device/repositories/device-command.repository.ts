import { pool } from '@/infrastructure/database/pool';

export type DeviceCommandStatus = 'pending' | 'sent' | 'accepted' | 'acknowledged' | 'failed';

export const MAX_OUTSTANDING_DEVICE_COMMANDS = 8;

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
}): Promise<DeviceCommandRecord | null> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Serialize command admission per device. PostgreSQL READ COMMITTED takes a
    // fresh snapshot for the count statement after this row lock is acquired,
    // so concurrent HTTP requests cannot both pass the outstanding-command cap.
    await client.query(
      'SELECT device_id FROM devices WHERE device_id = $1 FOR UPDATE',
      [input.deviceId],
    );

    const outstanding = await client.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM device_commands
       WHERE device_id = $1
         AND status IN ('pending', 'sent', 'accepted')`,
      [input.deviceId],
    );
    if (Number(outstanding.rows[0]?.total ?? 0) >= MAX_OUTSTANDING_DEVICE_COMMANDS) {
      await client.query('ROLLBACK');
      return null;
    }

    const result = await client.query<DeviceCommandRow>(
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

    await client.query('COMMIT');
    return mapRow(result.rows[0]);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original database error.
    }
    throw error;
  } finally {
    client.release();
  }
};

export const updateCommandStatus = async (
  id: number,
  status: DeviceCommandStatus,
  response?: string | null,
  options?: { markAcknowledged?: boolean; expectedDeviceId?: string; ackBootId?: string },
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
         ack_boot_id = CASE
           WHEN status IN ('acknowledged', 'failed') THEN ack_boot_id
           ELSE COALESCE($6::varchar, ack_boot_id)
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
      options?.ackBootId ?? null,
    ],
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

export const observeRuntimeBootAndFailStaleAccepted = async (
  deviceId: string,
  currentBootId: string,
): Promise<DeviceCommandRecord[]> => {
  const normalizedBootId = currentBootId.trim();
  if (!deviceId || !normalizedBootId) {
    return [];
  }

  const result = await pool.query<DeviceCommandRow>(
    `WITH observed_device AS (
       UPDATE devices
       SET runtime_boot_id = $2,
           updated_at = NOW()
       WHERE device_id = $1
       RETURNING device_id
     )
     UPDATE device_commands
     SET status = 'failed',
         response = 'device_restarted_before_execution',
         updated_at = NOW()
     WHERE device_id = $1
       AND status = 'accepted'
       AND ack_boot_id IS NOT NULL
       AND ack_boot_id <> $2
       AND EXISTS (SELECT 1 FROM observed_device)
     RETURNING id, device_id, command, params, status, sent_at, acked_at, response`,
    [deviceId, normalizedBootId],
  );

  return result.rows.map(mapRow);
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
