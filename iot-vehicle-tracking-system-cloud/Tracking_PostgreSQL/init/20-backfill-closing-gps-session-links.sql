-- =============================================================================
-- 20-backfill-closing-gps-session-links.sql
-- Attach legacy engine-off GPS points to the session they closed
-- =============================================================================

WITH closing_gps_candidates AS (
  SELECT
    e.id AS event_log_id,
    s.id AS session_id,
    ROW_NUMBER() OVER (
      PARTITION BY e.id
      ORDER BY
        ABS(EXTRACT(EPOCH FROM (COALESCE(e.device_timestamp, e.server_timestamp) - COALESCE(s.session_end, s.server_session_end)))) ASC,
        s.id DESC
    ) AS match_rank
  FROM event_logs e
  JOIN device_sessions s
    ON s.device_id = e.device_id
  WHERE e.session_id IS NULL
    AND s.status = 'completed'
    AND COALESCE(s.session_end, s.server_session_end) IS NOT NULL
    AND COALESCE(e.context#>>'{raw_payload,data,latitude}', e.context->>'latitude', e.metadata->>'latitude') IS NOT NULL
    AND COALESCE(e.context#>>'{raw_payload,data,longitude}', e.context->>'longitude', e.metadata->>'longitude') IS NOT NULL
    AND COALESCE(e.device_timestamp, e.server_timestamp) BETWEEN
      COALESCE(s.session_end, s.server_session_end) - INTERVAL '15 seconds'
      AND COALESCE(s.session_end, s.server_session_end) + INTERVAL '60 seconds'
    AND (
      (
        e.context#>>'{raw_payload,local_session_key}' ~ '^[0-9]+$'
        AND s.local_session_key IS NOT NULL
        AND (e.context#>>'{raw_payload,local_session_key}')::bigint = s.local_session_key
      )
      OR (
        COALESCE(e.context#>>'{raw_payload,boot_id}', e.context#>>'{raw_payload,metadata,boot_id}') IS NOT NULL
        AND s.firmware_boot_id IS NOT NULL
        AND COALESCE(e.context#>>'{raw_payload,boot_id}', e.context#>>'{raw_payload,metadata,boot_id}') = s.firmware_boot_id
      )
    )
)
UPDATE event_logs e
SET
  session_id = c.session_id,
  context = jsonb_set(
    jsonb_set(COALESCE(e.context, '{}'::jsonb), '{session_id}', to_jsonb(c.session_id), true),
    '{historical_session_append}',
    'true'::jsonb,
    true
  ),
  updated_at = NOW()
FROM closing_gps_candidates c
WHERE e.id = c.event_log_id
  AND c.match_rank = 1
  AND e.session_id IS NULL;
