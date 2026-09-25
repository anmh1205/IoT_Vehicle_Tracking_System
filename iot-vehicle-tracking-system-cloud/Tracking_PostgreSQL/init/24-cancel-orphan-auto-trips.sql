-- Cancel legacy auto-trips whose source device session was already discarded.
-- Exact code reconstruction avoids parsing device IDs that may contain dashes.
UPDATE trips t
SET status = 'cancelled',
    actual_end = COALESCE(actual_end, actual_start),
    updated_at = NOW()
WHERE t.status = 'in_progress'
  AND t.trip_code LIKE 'AUTO-%-SESSION-%'
  AND NOT EXISTS (
    SELECT 1
    FROM device_sessions s
    WHERE t.trip_code = ('AUTO-' || s.device_id || '-SESSION-' || s.id::text)
  );
