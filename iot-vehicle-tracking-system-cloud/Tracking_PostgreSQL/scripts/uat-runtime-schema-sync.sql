-- Keep long-lived UAT databases aligned with tables added after first bootstrap.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'update_updated_at'
          AND pg_function_is_visible(oid)
    ) THEN
        CREATE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS vehicle_allowed_zones (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    zone_type VARCHAR(16) NOT NULL DEFAULT 'circle',
    center_lat DECIMAL(10,8) NOT NULL,
    center_lon DECIMAL(11,8) NOT NULL,
    radius_m DOUBLE PRECISION NOT NULL,
    center_source VARCHAR(32) NOT NULL,
    center_snapshot_at TIMESTAMPTZ,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    last_membership_state VARCHAR(16) NOT NULL DEFAULT 'unknown',
    last_membership_changed_at TIMESTAMPTZ,
    last_alerted_state VARCHAR(16),
    last_alerted_at TIMESTAMPTZ,
    suppression_until TIMESTAMPTZ,
    alert_mode VARCHAR(32) NOT NULL DEFAULT 'transition_only',
    cooldown_sec INTEGER NOT NULL DEFAULT 300,
    source_warning_json JSONB,
    created_by INT REFERENCES users(id),
    updated_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS zone_type VARCHAR(16) NOT NULL DEFAULT 'circle';
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS center_lat DECIMAL(10,8);
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS center_lon DECIMAL(11,8);
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS radius_m DOUBLE PRECISION;
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS center_source VARCHAR(32) NOT NULL DEFAULT 'vehicle_position';
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS center_snapshot_at TIMESTAMPTZ;
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active';
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS last_membership_state VARCHAR(16) NOT NULL DEFAULT 'unknown';
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS last_membership_changed_at TIMESTAMPTZ;
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS last_alerted_state VARCHAR(16);
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS last_alerted_at TIMESTAMPTZ;
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS suppression_until TIMESTAMPTZ;
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS alert_mode VARCHAR(32) NOT NULL DEFAULT 'transition_only';
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS cooldown_sec INTEGER NOT NULL DEFAULT 300;
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS source_warning_json JSONB;
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id);
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES users(id);
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE vehicle_allowed_zones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE vehicle_allowed_zones
SET
    zone_type = COALESCE(zone_type, 'circle'),
    center_source = COALESCE(center_source, 'vehicle_position'),
    status = COALESCE(status, 'active'),
    last_membership_state = COALESCE(last_membership_state, 'unknown'),
    alert_mode = COALESCE(alert_mode, 'transition_only'),
    cooldown_sec = COALESCE(cooldown_sec, 300),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE
    zone_type IS NULL
    OR center_source IS NULL
    OR status IS NULL
    OR last_membership_state IS NULL
    OR alert_mode IS NULL
    OR cooldown_sec IS NULL
    OR created_at IS NULL
    OR updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_allowed_zones_vehicle_unique
    ON vehicle_allowed_zones(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_allowed_zones_status
    ON vehicle_allowed_zones(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_allowed_zones_updated_at
    ON vehicle_allowed_zones(updated_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_vehicle_allowed_zones_updated_at'
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER trigger_vehicle_allowed_zones_updated_at
            BEFORE UPDATE ON vehicle_allowed_zones
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS notification_states (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_id BIGINT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    hidden_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_states ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notification_states ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notification_states ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
ALTER TABLE notification_states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE notification_states ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE notification_states
SET
    is_read = COALESCE(is_read, FALSE),
    updated_at = COALESCE(updated_at, NOW()),
    created_at = COALESCE(created_at, NOW())
WHERE
    is_read IS NULL
    OR updated_at IS NULL
    OR created_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_states_user_alert_unique
    ON notification_states(user_id, alert_id);
CREATE INDEX IF NOT EXISTS idx_notification_states_user_id
    ON notification_states(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_states_alert_id
    ON notification_states(alert_id);
CREATE INDEX IF NOT EXISTS idx_notification_states_user_read
    ON notification_states(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_states_user_hidden
    ON notification_states(user_id, hidden_at);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_notification_states_updated_at'
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER trigger_notification_states_updated_at
            BEFORE UPDATE ON notification_states
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;
