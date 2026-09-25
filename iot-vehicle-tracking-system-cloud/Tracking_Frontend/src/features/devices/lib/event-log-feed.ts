const resolveTimestamp = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
};

export const resolveEventLogTimestamp = (row: Record<string, unknown>): string | null =>
  resolveTimestamp(
    row.event_timestamp ??
      row.device_timestamp ??
      row.deviceTimestamp ??
      row.server_timestamp ??
      row.created_at ??
      row.createdAt,
  );
