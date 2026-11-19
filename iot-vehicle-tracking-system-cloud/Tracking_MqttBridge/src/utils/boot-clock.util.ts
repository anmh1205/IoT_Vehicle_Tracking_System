import { pool } from '../infrastructure/pool';

/**
 * Bridge authoritative UTC to monotonic uptime for the SAME boot only.
 * Never substitute a different boot's wall clock for untrusted packets.
 */
export interface BootClockResolutionInput {
  deviceId: string;
  bootId: string | null;
  uptimeMs: number | null;
  timestampTrusted?: boolean;
  timestampMs: number;
  timestampSource: string;
  receivedAtMs: number;
}

export interface BootClockResolution {
  timestampMs: number;
  source: string;
}

const EARLIEST_VALID_EPOCH_MS = Date.UTC(2020, 0, 1);
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_BOOT_UPTIME_MS = 31 * 24 * 60 * 60 * 1000;

/**
 * On trustworthy GNSS/RTC time, persist a boot-specific timestamp/uptime pair.
 * On delayed untrusted replay, derive the capture time from the pair when it
 * exists, otherwise mark receive-time fallback explicitly (never pretend UTC).
 */
export const resolveBootClockTimestamp = async (
  input: BootClockResolutionInput,
): Promise<BootClockResolution> => {
  const validUptime = input.uptimeMs !== null &&
    Number.isFinite(input.uptimeMs) && input.uptimeMs >= 0 &&
    input.uptimeMs <= MAX_BOOT_UPTIME_MS;
  if (!input.bootId || !validUptime) {
    return { timestampMs: input.timestampMs, source: input.timestampSource };
  }

  if (
    input.timestampTrusted === true &&
    input.timestampSource === 'payload' &&
    input.timestampMs >= EARLIEST_VALID_EPOCH_MS &&
    input.timestampMs <= input.receivedAtMs + MAX_FUTURE_SKEW_MS
  ) {
    await pool.query(
      `INSERT INTO device_boot_clock_anchors
         (device_id, boot_id, anchor_uptime_ms, anchor_utc_ms)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (device_id, boot_id) DO NOTHING`,
      [input.deviceId, input.bootId, input.uptimeMs, input.timestampMs],
    );
    return { timestampMs: input.timestampMs, source: input.timestampSource };
  }

  if (input.timestampTrusted !== false) {
    return { timestampMs: input.timestampMs, source: input.timestampSource };
  }
  const result = await pool.query<{
    anchor_uptime_ms: string;
    anchor_utc_ms: string;
  }>(
    `SELECT anchor_uptime_ms, anchor_utc_ms
       FROM device_boot_clock_anchors
      WHERE device_id = $1 AND boot_id = $2`,
    [input.deviceId, input.bootId],
  );
  if (!result.rowCount) {
    return { timestampMs: input.receivedAtMs, source: 'untrusted_receive_time' };
  }
  const anchor = result.rows[0];
  const reconstructedMs = Number(anchor.anchor_utc_ms) +
    (input.uptimeMs! - Number(anchor.anchor_uptime_ms));
  if (!Number.isSafeInteger(reconstructedMs) ||
      reconstructedMs < EARLIEST_VALID_EPOCH_MS ||
      reconstructedMs > input.receivedAtMs + MAX_FUTURE_SKEW_MS) {
    return { timestampMs: input.receivedAtMs, source: 'untrusted_receive_time' };
  }
  return { timestampMs: reconstructedMs, source: 'boot_anchor' };
};
