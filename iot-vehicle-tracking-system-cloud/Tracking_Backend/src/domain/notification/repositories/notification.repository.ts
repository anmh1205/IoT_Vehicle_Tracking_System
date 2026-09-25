import type { QueryResultRow } from 'pg';
import { executeQuery, findMany } from '@/infrastructure/database/queries';

export type NotificationType = 'alert' | 'system' | 'export' | 'firmware' | 'zone';

export interface NotificationRow extends QueryResultRow {
  id: number;
  alert_type: string;
  title: string;
  message: string | null;
  created_at: Date;
  vehicle_id: string | null;
  vehicle_plate_number: string | null;
  device_id: string | null;
  device_name: string | null;
  context_label: string | null;
  is_read: boolean;
}

export interface NotificationFilters {
  type?: NotificationType;
  search?: string;
  from?: string;
  to?: string;
}

const NOTIFICATION_LINK_JOINS = `LEFT JOIN devices d ON d.device_id = a.device_id
  LEFT JOIN LATERAL (
    SELECT
      v.vehicle_id,
      v.plate_number AS vehicle_plate_number
    FROM vehicles v
    WHERE
      (a.vehicle_id IS NOT NULL AND v.vehicle_id = a.vehicle_id)
      OR (a.device_id IS NOT NULL AND v.device_id = a.device_id)
      OR (d.vehicle_id IS NOT NULL AND v.vehicle_id = d.vehicle_id)
    ORDER BY
      CASE
        WHEN a.vehicle_id IS NOT NULL AND v.vehicle_id = a.vehicle_id THEN 0
        WHEN a.device_id IS NOT NULL AND v.device_id = a.device_id THEN 1
        ELSE 2
      END,
      v.updated_at DESC,
      v.id DESC
    LIMIT 1
  ) link ON true`;

const buildTypeClause = (
  type: NotificationType,
  startIndex: number,
): { clause: string; values: unknown[] } => {
  if (type === 'zone') {
    return {
      clause: `(a.alert_type::text ILIKE $${startIndex} OR a.alert_type::text ILIKE $${startIndex + 1})`,
      values: ['%zone%', '%geofence%'],
    };
  }

  if (type === 'firmware') {
    return { clause: `a.alert_type::text ILIKE $${startIndex}`, values: ['%firmware%'] };
  }

  if (type === 'export') {
    return { clause: `a.alert_type::text ILIKE $${startIndex}`, values: ['%export%'] };
  }

  if (type === 'system') {
    return {
      clause: `(
        a.alert_type::text ILIKE $${startIndex}
        OR a.alert_type::text ILIKE $${startIndex + 1}
        OR a.alert_type::text ILIKE $${startIndex + 2}
        OR a.alert_type::text ILIKE $${startIndex + 3}
      )`,
      values: ['%system%', '%offline%', '%database%', '%service%'],
    };
  }

  return {
    clause: `(
      a.alert_type::text NOT ILIKE $${startIndex}
      AND a.alert_type::text NOT ILIKE $${startIndex + 1}
      AND a.alert_type::text NOT ILIKE $${startIndex + 2}
      AND a.alert_type::text NOT ILIKE $${startIndex + 3}
      AND a.alert_type::text NOT ILIKE $${startIndex + 4}
      AND a.alert_type::text NOT ILIKE $${startIndex + 5}
      AND a.alert_type::text NOT ILIKE $${startIndex + 6}
      AND a.alert_type::text NOT ILIKE $${startIndex + 7}
    )`,
    values: [
      '%zone%',
      '%geofence%',
      '%firmware%',
      '%export%',
      '%system%',
      '%offline%',
      '%database%',
      '%service%',
    ],
  };
};

const buildFilterSql = (
  filters: NotificationFilters,
): {
  whereClause: string;
  values: unknown[];
} => {
  const conditions: string[] = ['state.hidden_at IS NULL'];
  const values: unknown[] = [];
  let paramIndex = 2;

  if (filters.type) {
    const typeClause = buildTypeClause(filters.type, paramIndex);
    conditions.push(typeClause.clause);
    values.push(...typeClause.values);
    paramIndex += typeClause.values.length;
  }

  if (filters.search && filters.search.trim()) {
    conditions.push(
      `(a.title ILIKE $${paramIndex} OR COALESCE(a.message, '') ILIKE $${paramIndex} OR COALESCE(link.vehicle_plate_number, '') ILIKE $${paramIndex} OR COALESCE(link.vehicle_id, '') ILIKE $${paramIndex} OR COALESCE(d.device_name, '') ILIKE $${paramIndex} OR COALESCE(a.vehicle_id, '') ILIKE $${paramIndex} OR COALESCE(a.device_id, '') ILIKE $${paramIndex})`,
    );
    values.push(`%${filters.search.trim()}%`);
    paramIndex += 1;
  }

  if (filters.from) {
    conditions.push(`a.created_at >= $${paramIndex}`);
    values.push(filters.from);
    paramIndex += 1;
  }

  if (filters.to) {
    conditions.push(`a.created_at <= $${paramIndex}`);
    values.push(filters.to);
  }

  return {
    whereClause: `WHERE ${conditions.join(' AND ')}`,
    values,
  };
};

export const findNotificationRows = async (
  userId: number,
  filters: NotificationFilters,
): Promise<NotificationRow[]> => {
  const { whereClause, values } = buildFilterSql(filters);
  return findMany<NotificationRow>(
    `SELECT
        a.id,
        a.alert_type,
        a.title,
        a.message,
        a.created_at,
        COALESCE(a.vehicle_id, link.vehicle_id) AS vehicle_id,
        link.vehicle_plate_number,
        a.device_id,
        d.device_name,
        CASE
          WHEN link.vehicle_plate_number IS NOT NULL AND d.device_name IS NOT NULL
            THEN 'Xe ' || link.vehicle_plate_number || ' · Thiết bị ' || d.device_name
          WHEN link.vehicle_plate_number IS NOT NULL
            THEN 'Xe ' || link.vehicle_plate_number
          WHEN link.vehicle_id IS NOT NULL AND d.device_name IS NOT NULL
            THEN 'Xe ' || link.vehicle_id || ' · Thiết bị ' || d.device_name
          WHEN link.vehicle_id IS NOT NULL
            THEN 'Xe ' || link.vehicle_id
          WHEN d.device_name IS NOT NULL
            THEN 'Thiết bị ' || d.device_name
          WHEN a.vehicle_id IS NOT NULL
            THEN 'Xe ' || a.vehicle_id
          WHEN a.device_id IS NOT NULL
            THEN 'Thiết bị ' || a.device_id
          ELSE NULL
        END AS context_label,
        COALESCE(state.is_read, FALSE) AS is_read
     FROM alerts a
     ${NOTIFICATION_LINK_JOINS}
     LEFT JOIN notification_states state
       ON state.user_id = $1 AND state.alert_id = a.id
     ${whereClause}
     ORDER BY a.created_at DESC`,
    [userId, ...values],
  );
};

export const markNotificationRead = async (userId: number, alertId: number): Promise<void> => {
  await executeQuery(
    `INSERT INTO notification_states (user_id, alert_id, is_read, read_at, updated_at)
     VALUES ($1, $2, TRUE, NOW(), NOW())
     ON CONFLICT (user_id, alert_id)
     DO UPDATE SET
       is_read = TRUE,
       read_at = NOW(),
       updated_at = NOW()`,
    [userId, alertId],
  );
};

export const markAllNotificationsRead = async (userId: number): Promise<void> => {
  await executeQuery(
    `INSERT INTO notification_states (user_id, alert_id, is_read, read_at, updated_at)
     SELECT $1, a.id, TRUE, NOW(), NOW()
     FROM alerts a
     ON CONFLICT (user_id, alert_id)
     DO UPDATE SET
       is_read = TRUE,
       read_at = COALESCE(notification_states.read_at, EXCLUDED.read_at),
       updated_at = NOW()
     WHERE notification_states.hidden_at IS NULL`,
    [userId],
  );
};

export const hideNotification = async (userId: number, alertId: number): Promise<void> => {
  await executeQuery(
    `INSERT INTO notification_states (user_id, alert_id, is_read, read_at, hidden_at, updated_at)
     VALUES ($1, $2, TRUE, NOW(), NOW(), NOW())
     ON CONFLICT (user_id, alert_id)
     DO UPDATE SET
       is_read = TRUE,
       read_at = COALESCE(notification_states.read_at, NOW()),
       hidden_at = COALESCE(notification_states.hidden_at, NOW()),
       updated_at = NOW()`,
    [userId, alertId],
  );
};
