-- Deduplicate retained rawdata event logs before enforcing message identity uniqueness.
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY device_id, metadata->>'message_id'
            ORDER BY id ASC
        ) AS rn
    FROM event_logs
    WHERE event_code = 'mqtt_bridge_rawdata'
      AND metadata->>'message_id' IS NOT NULL
)
DELETE FROM event_logs e
USING ranked r
WHERE e.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_logs_mqtt_bridge_message
ON event_logs(device_id, (metadata->>'message_id'))
WHERE event_code = 'mqtt_bridge_rawdata'
  AND metadata->>'message_id' IS NOT NULL;
