-- Reconcile legacy auto-trips whose exact source session is already completed.
UPDATE trips t
SET status = 'completed',
    actual_end = GREATEST(
      t.actual_start,
      COALESCE(s.session_end, s.server_session_end, t.actual_start)
    ),
    updated_at = NOW()
FROM device_sessions s
WHERE t.status = 'in_progress'
  AND s.status = 'completed'
  AND t.trip_code = ('AUTO-' || s.device_id || '-SESSION-' || s.id::text);
