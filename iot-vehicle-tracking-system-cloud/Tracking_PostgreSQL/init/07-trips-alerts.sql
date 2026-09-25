-- =============================================================================
-- 07-trips-alerts.sql
-- Trips and alerts tables for vehicle tracking
-- =============================================================================

-- -----------------------------------------------------------------------------
-- trips
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
    id BIGSERIAL PRIMARY KEY,
    trip_code VARCHAR(50) UNIQUE NOT NULL,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    device_id VARCHAR(50) REFERENCES devices(device_id),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    start_location TEXT,
    start_latitude DECIMAL(10,8),
    start_longitude DECIMAL(11,8),
    end_location TEXT,
    end_latitude DECIMAL(10,8),
    end_longitude DECIMAL(11,8),
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    distance_km DECIMAL(10,2),
    fuel_used_liters DECIMAL(10,2),
    status trip_status DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_device_id ON trips(device_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON trips(planned_start, planned_end);

CREATE TRIGGER trigger_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- alerts (geofence_id FK added in 08-geofences.sql after geofences table exists)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    device_id VARCHAR(50) REFERENCES devices(device_id),
    trip_id BIGINT REFERENCES trips(id),
    geofence_id INT,
    alert_type alert_type NOT NULL,
    source alert_source_enum DEFAULT 'device',
    severity alert_severity DEFAULT 'medium',
    status alert_status DEFAULT 'active',
    title VARCHAR(200) NOT NULL,
    message TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    speed DECIMAL(6,2),
    threshold_value DECIMAL(10,2),
    actual_value DECIMAL(10,2),
    source_message_id VARCHAR(96),
    acknowledged_by INT REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by INT REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_source ON alerts(source);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_alerts_source_message_id
    ON alerts(device_id, source_message_id, alert_type, title)
    WHERE source_message_id IS NOT NULL;

CREATE TRIGGER trigger_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
