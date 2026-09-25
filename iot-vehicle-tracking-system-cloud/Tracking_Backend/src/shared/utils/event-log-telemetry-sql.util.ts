type PositionField = 'latitude' | 'longitude' | 'speed' | 'course';

const column = (alias: string | undefined, name: 'context' | 'metadata'): string =>
  alias ? `${alias}.${name}` : name;

/**
 * Read normalized position telemetry from event_logs.
 *
 * New mqtt_bridge_rawdata rows carry context.position_valid. For those rows,
 * normalized context is authoritative and raw_payload is diagnostics only.
 * Legacy rows without the flag retain the historical raw-payload fallback.
 */
export const eventLogPositionValueSql = (
  field: PositionField,
  alias?: string,
): string => {
  const context = column(alias, 'context');
  const metadata = column(alias, 'metadata');

  return `CASE
    WHEN ${context} ? 'position_valid'
      THEN NULLIF(${context}->>'${field}', '')
    ELSE COALESCE(
      NULLIF(${context}->>'${field}', ''),
      NULLIF(${context}#>>'{raw_payload,data,${field}}', ''),
      NULLIF(${metadata}->>'${field}', '')
    )
  END`;
};

export const eventLogPositionExistsSql = (
  field: PositionField,
  alias?: string,
): string => {
  const context = column(alias, 'context');
  const normalized = eventLogPositionValueSql(field, alias);

  return `(
    CASE
      WHEN ${context} ? 'position_valid'
        THEN (${context}->>'position_valid')::boolean AND ${normalized} IS NOT NULL
      ELSE ${normalized} IS NOT NULL
    END
  )`;
};

export const eventLogValidPositionSql = (alias?: string): string =>
  `(${eventLogPositionExistsSql('latitude', alias)}
    AND ${eventLogPositionExistsSql('longitude', alias)})`;


/**
 * Latest/live-state readers must ignore event rows that the bridge explicitly
 * classified as historical-only. Legacy rows without the flag remain eligible.
 */
export const eventLogLiveMutationSql = (alias?: string): string => {
  const context = column(alias, 'context');
  return `COALESCE((${context}->>'live_mutation')::boolean, true)`;
};

/** Effective device occurrence time, falling back to server receive time. */
export const eventLogTelemetryTimestampSql = (alias?: string): string => {
  const prefix = alias ? `${alias}.` : '';
  return `COALESCE(${prefix}device_timestamp, ${prefix}server_timestamp)`;
};
