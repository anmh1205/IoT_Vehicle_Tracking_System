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

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ignition_state_enum') THEN
        CREATE TYPE ignition_state_enum AS ENUM ('ON', 'OFF', 'UNKNOWN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'motion_state_enum') THEN
        CREATE TYPE motion_state_enum AS ENUM ('MOVING', 'STATIONARY', 'UNKNOWN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_runtime_state_enum') THEN
        CREATE TYPE vehicle_runtime_state_enum AS ENUM (
            'PARKED_OFF',
            'ROLLING_IGN_OFF',
            'IDLING_ON',
            'MOVING_ON',
            'UNKNOWN_STATIONARY',
            'UNKNOWN_MOVING',
            'UNKNOWN'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_runtime_state_enum') THEN
        CREATE TYPE device_runtime_state_enum AS ENUM (
            'BOOTING',
            'ACTIVE',
            'SLEEP_PREPARE',
            'SLEEPING',
            'WAKING',
            'ALARM',
            'OTA',
            'FAULT'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sleep_mode_enum') THEN
        CREATE TYPE sleep_mode_enum AS ENUM ('NONE', 'FAKE', 'LIGHT', 'DEEP');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_source_enum') THEN
        CREATE TYPE alert_source_enum AS ENUM ('device', 'ecu');
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'device_status_enum'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'device_status_enum'
          AND e.enumlabel = 'online'
    ) THEN
        ALTER TYPE device_status_enum ADD VALUE 'online';
    END IF;
END $$;

ALTER TABLE devices ADD COLUMN IF NOT EXISTS ignition_state ignition_state_enum;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS motion_state motion_state_enum;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS vehicle_state vehicle_runtime_state_enum;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_state device_runtime_state_enum;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS sleep_mode sleep_mode_enum;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS state_updated_at TIMESTAMPTZ;

UPDATE devices
SET
    ignition_state = COALESCE(
        ignition_state,
        CASE
            WHEN current_status = 'running' THEN 'ON'::ignition_state_enum
            WHEN current_status = 'stopped' THEN 'OFF'::ignition_state_enum
            ELSE 'UNKNOWN'::ignition_state_enum
        END
    ),
    motion_state = COALESCE(
        motion_state,
        CASE
            WHEN current_status = 'stopped' THEN 'STATIONARY'::motion_state_enum
            ELSE 'UNKNOWN'::motion_state_enum
        END
    ),
    vehicle_state = COALESCE(
        vehicle_state,
        CASE
            WHEN current_status = 'stopped' THEN 'PARKED_OFF'::vehicle_runtime_state_enum
            ELSE 'UNKNOWN'::vehicle_runtime_state_enum
        END
    ),
    device_state = COALESCE(
        device_state,
        CASE
            WHEN current_status = 'disconnected' THEN 'FAULT'::device_runtime_state_enum
            ELSE 'ACTIVE'::device_runtime_state_enum
        END
    ),
    sleep_mode = COALESCE(sleep_mode, 'NONE'::sleep_mode_enum),
    state_updated_at = COALESCE(state_updated_at, last_seen_at, NOW())
WHERE
    ignition_state IS NULL
    OR motion_state IS NULL
    OR vehicle_state IS NULL
    OR device_state IS NULL
    OR sleep_mode IS NULL
    OR state_updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_devices_state_updated_at
    ON devices(state_updated_at DESC);

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS source alert_source_enum DEFAULT 'device';

UPDATE alerts
SET source = CASE
    WHEN title LIKE 'OBD:%'
      OR message ILIKE '%dtc%'
      OR message ILIKE '%ecu%'
      OR message ILIKE '%MIL%'
    THEN 'ecu'::alert_source_enum
    ELSE 'device'::alert_source_enum
END
WHERE source IS NULL
   OR (
        source = 'device'
        AND (
            title LIKE 'OBD:%'
            OR message ILIKE '%dtc%'
            OR message ILIKE '%ecu%'
            OR message ILIKE '%MIL%'
        )
   );

CREATE INDEX IF NOT EXISTS idx_alerts_source
    ON alerts(source);

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
