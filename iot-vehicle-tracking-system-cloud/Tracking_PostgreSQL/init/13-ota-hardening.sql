-- =============================================================================
-- 13-ota-hardening.sql
-- OTA firmware update log hardening columns for ordering/reconcile semantics
-- =============================================================================

ALTER TABLE firmware_update_log
    ADD COLUMN IF NOT EXISTS status_reason_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS first_assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS command_dispatched_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_message_id UUID,
    ADD COLUMN IF NOT EXISTS last_seq_no BIGINT,
    ADD COLUMN IF NOT EXISTS last_boot_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS confirm_timeout_sec INTEGER;

UPDATE firmware_update_log
SET confirm_timeout_sec = 180
WHERE confirm_timeout_sec IS NULL;

ALTER TABLE firmware_update_log
    ALTER COLUMN confirm_timeout_sec SET DEFAULT 180;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_firmware_update_log_confirm_timeout_sec_positive'
    ) THEN
        ALTER TABLE firmware_update_log
            ADD CONSTRAINT chk_firmware_update_log_confirm_timeout_sec_positive
            CHECK (confirm_timeout_sec > 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_firmware_update_log_job_device
    ON firmware_update_log(job_id, device_id);

CREATE INDEX IF NOT EXISTS idx_firmware_update_log_last_seen
    ON firmware_update_log(last_seen_at DESC);

