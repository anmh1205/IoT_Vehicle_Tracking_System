import { executeQuery } from '@/infrastructure/database/queries';

export interface PushTokenDeviceInfo {
  platform?: string;
  appVersion?: string;
  [key: string]: unknown;
}

export const registerPushToken = async (
  userId: number,
  token: string,
  deviceInfo?: PushTokenDeviceInfo,
): Promise<void> => {
  // An FCM registration token identifies one app installation. If the same
  // installation signs in as another user, retire the previous ownership first.
  await executeQuery(
    `UPDATE fcm_tokens
     SET deleted_at = NOW()
     WHERE token = $1 AND user_id <> $2 AND deleted_at IS NULL`,
    [token, userId],
  );

  const updated = await executeQuery(
    `UPDATE fcm_tokens
     SET device_info = $3::jsonb, deleted_at = NULL
     WHERE id = (
       SELECT id
       FROM fcm_tokens
       WHERE user_id = $1 AND token = $2
       ORDER BY id DESC
       LIMIT 1
     )`,
    [userId, token, JSON.stringify(deviceInfo ?? {})],
  );

  if (updated === 0) {
    await executeQuery(
      `INSERT INTO fcm_tokens (user_id, token, device_info)
       VALUES ($1, $2, $3::jsonb)`,
      [userId, token, JSON.stringify(deviceInfo ?? {})],
    );
  }
};

export const unregisterPushToken = async (
  userId: number,
  token: string,
): Promise<boolean> => {
  const count = await executeQuery(
    `UPDATE fcm_tokens
     SET deleted_at = NOW()
     WHERE user_id = $1 AND token = $2 AND deleted_at IS NULL`,
    [userId, token],
  );
  return count > 0;
};
