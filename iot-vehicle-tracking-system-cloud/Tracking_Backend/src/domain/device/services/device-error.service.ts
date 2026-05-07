import { findMany } from '@/infrastructure/database/queries';

interface DeviceErrorRow {
  id: number;
  error_code: number | null;
  message: string | null;
  context: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  server_timestamp: Date;
  resolved_at: Date | null;
}

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const normalizeDtcCodes = (value: unknown): string[] => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed.toUpperCase()] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
    .filter((item) => item.length > 0);
};

const extractDtcCodes = (row: DeviceErrorRow): string[] => {
  const metadataDtc = row.metadata?.dtc;
  if (typeof metadataDtc === 'string') {
    return [metadataDtc.trim().toUpperCase()].filter((item) => item.length > 0);
  }

  const contextDiagnostics = toRecord(row.context?.diagnostics);
  const contextDtc = toRecord(contextDiagnostics?.dtc);
  const rawPayload = toRecord(row.context?.raw_payload);
  const rawDiagnostics = toRecord(rawPayload?.diagnostics);
  const rawDtc = toRecord(rawDiagnostics?.dtc);

  const codes = [
    ...normalizeDtcCodes(row.metadata?.pending_dtc),
    ...normalizeDtcCodes(row.metadata?.stored_dtc),
    ...normalizeDtcCodes(row.metadata?.permanent_dtc),
    ...normalizeDtcCodes(rawDtc?.pending),
    ...normalizeDtcCodes(rawDtc?.stored),
    ...normalizeDtcCodes(rawDtc?.permanent),
    ...normalizeDtcCodes(contextDtc?.pending),
    ...normalizeDtcCodes(contextDtc?.stored),
    ...normalizeDtcCodes(contextDtc?.permanent),
  ];

  return Array.from(new Set(codes));
};

const extractDtcLabel = (row: DeviceErrorRow): string | null => {
  const dtcCodes = extractDtcCodes(row);
  if (dtcCodes.length > 0) {
    return dtcCodes[0];
  }

  const matchedCode = row.message?.match(/\b[PCBU][0-9A-F]{4}\b/i)?.[0];
  return matchedCode ? matchedCode.toUpperCase() : null;
};

export const listErrors = async (deviceId: string, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const meaningfulErrorCodeSql = `
    COALESCE(
      error_code,
      NULLIF(context->>'error_code', '')::int,
      NULLIF(context#>>'{raw_payload,data,error_code}', '')::int
    )
  `;
  const hasNonEmptyDtcSql = `(
    COALESCE(jsonb_array_length(COALESCE(metadata->'pending_dtc', '[]'::jsonb)), 0) > 0
    OR COALESCE(jsonb_array_length(COALESCE(metadata->'stored_dtc', '[]'::jsonb)), 0) > 0
    OR COALESCE(jsonb_array_length(COALESCE(metadata->'permanent_dtc', '[]'::jsonb)), 0) > 0
    OR COALESCE(NULLIF(BTRIM(COALESCE(metadata->>'dtc', '')), ''), '') <> ''
    OR COALESCE(jsonb_array_length(COALESCE(context#>'{diagnostics,dtc,pending}', '[]'::jsonb)), 0) > 0
    OR COALESCE(jsonb_array_length(COALESCE(context#>'{diagnostics,dtc,stored}', '[]'::jsonb)), 0) > 0
    OR COALESCE(jsonb_array_length(COALESCE(context#>'{diagnostics,dtc,permanent}', '[]'::jsonb)), 0) > 0
    OR COALESCE(jsonb_array_length(COALESCE(context#>'{raw_payload,diagnostics,dtc,pending}', '[]'::jsonb)), 0) > 0
    OR COALESCE(jsonb_array_length(COALESCE(context#>'{raw_payload,diagnostics,dtc,stored}', '[]'::jsonb)), 0) > 0
    OR COALESCE(jsonb_array_length(COALESCE(context#>'{raw_payload,diagnostics,dtc,permanent}', '[]'::jsonb)), 0) > 0
  )`;
  const filterSql = `device_id = $1
    AND (
      (${meaningfulErrorCodeSql} IS NOT NULL AND ${meaningfulErrorCodeSql} <> 0)
      OR ${hasNonEmptyDtcSql}
    )`;
  const [rows, totalRows] = await Promise.all([
    findMany<DeviceErrorRow>(
      `SELECT id, error_code, message, context, metadata, server_timestamp, resolved_at
       FROM event_logs
       WHERE ${filterSql}
       ORDER BY server_timestamp DESC
       LIMIT $2 OFFSET $3`,
      [deviceId, limit, offset],
    ),
    findMany<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM event_logs
       WHERE ${filterSql}`,
      [deviceId],
    ),
  ]);
  const total = totalRows[0]?.total ?? 0;

  return {
    items: rows.map((row) => ({
      id: row.id,
      errorCode: row.error_code ?? 0,
      errorName: extractDtcLabel(row) ?? `Code ${row.error_code ?? 0}`,
      description: row.message ?? '',
      occurredAt: row.server_timestamp.toISOString(),
      resolvedAt: row.resolved_at?.toISOString() ?? null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / Math.max(limit, 1)), 1),
    },
  };
};
