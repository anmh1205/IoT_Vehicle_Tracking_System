const SECOND_TIMESTAMP_THRESHOLD = 10_000_000_000;
const MICROSECOND_TIMESTAMP_THRESHOLD = 10_000_000_000_000;
const MAX_PAST_SKEW_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 10 * 60 * 1000;
const MIN_PLAUSIBLE_HISTORICAL_TIMESTAMP_MS = Date.UTC(2020, 0, 1);

export type TimestampSource =
  | 'payload'
  | 'payload_historical'
  | 'metadata_sent_at'
  | 'metadata_sent_at_historical'
  | 'server_now';

export interface NormalizedTimestamp {
  timestampMs: number;
  source: TimestampSource;
}

export const parseIsoTimestampMs = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const maxTimestampMs = (...values: Array<number | null | undefined>): number | null => {
  let maxValue: number | null = null;

  values.forEach((value) => {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return;
    }

    maxValue = maxValue === null ? value : Math.max(maxValue, value);
  });

  return maxValue;
};

const normalizeUnixTimestamp = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return Number.NaN;
  }

  if (value < SECOND_TIMESTAMP_THRESHOLD) {
    return Math.trunc(value * 1000);
  }

  if (value >= MICROSECOND_TIMESTAMP_THRESHOLD) {
    return Math.trunc(value / 1000);
  }

  return Math.trunc(value);
};

const isTimestampWithinWindow = (timestampMs: number, nowMs: number): boolean =>
  timestampMs >= nowMs - MAX_PAST_SKEW_MS && timestampMs <= nowMs + MAX_FUTURE_SKEW_MS;

const isPlausibleHistoricalTimestamp = (timestampMs: number, nowMs: number): boolean =>
  Number.isFinite(timestampMs) &&
  timestampMs >= MIN_PLAUSIBLE_HISTORICAL_TIMESTAMP_MS &&
  timestampMs < nowMs - MAX_PAST_SKEW_MS;

export const normalizePayloadTimestamp = (
  payloadTimestamp?: number,
  metadataSentAt?: number,
  nowMs = Date.now(),
): NormalizedTimestamp => {
  const payloadTimestampMs = normalizeUnixTimestamp(payloadTimestamp ?? Number.NaN);
  if (isTimestampWithinWindow(payloadTimestampMs, nowMs)) {
    return { timestampMs: payloadTimestampMs, source: 'payload' };
  }

  const metadataTimestampMs = normalizeUnixTimestamp(metadataSentAt ?? Number.NaN);
  if (isTimestampWithinWindow(metadataTimestampMs, nowMs)) {
    return { timestampMs: metadataTimestampMs, source: 'metadata_sent_at' };
  }

  // Offline replay can legitimately deliver telemetry days or weeks after it was
  // captured. Preserve a plausible historical device time instead of rewriting
  // it to receive-time; downstream watermark logic will then keep it out of the
  // live-state path while still retaining the original tracking/session history.
  if (isPlausibleHistoricalTimestamp(payloadTimestampMs, nowMs)) {
    return { timestampMs: payloadTimestampMs, source: 'payload_historical' };
  }

  if (isPlausibleHistoricalTimestamp(metadataTimestampMs, nowMs)) {
    return { timestampMs: metadataTimestampMs, source: 'metadata_sent_at_historical' };
  }

  return { timestampMs: nowMs, source: 'server_now' };
};
