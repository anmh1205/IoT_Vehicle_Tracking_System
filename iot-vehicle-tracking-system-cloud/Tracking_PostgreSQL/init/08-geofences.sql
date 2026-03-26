-- =============================================================================
-- 08-geofences.sql
-- Geofences, geofence-vehicle assignments, maintenance, and deferred FK for alerts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- geofences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geofences (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    geofence_type geofence_type DEFAULT 'circle',
    center_latitude DECIMAL(10,8),
    center_longitude DECIMAL(11,8),
    radius_meters INTEGER,
    coordinates JSONB,
    trigger_on geofence_trigger DEFAULT 'both',
    is_active BOOLEAN DEFAULT true,
    notify_email BOOLEAN DEFAULT false,
    notify_push BOOLEAN DEFAULT true,
    color VARCHAR(7) DEFAULT '#3388ff',
    display_hidden BOOLEAN DEFAULT false,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active);

CREATE TRIGGER trigger_geofences_updated_at
    BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- geofence_vehicles (many-to-many: geofences <-> vehicles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geofence_vehicles (
    id SERIAL PRIMARY KEY,
    geofence_id INT NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    vehicle_id VARCHAR(50) NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(geofence_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_geofence_vehicles_geofence_id ON geofence_vehicles(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_vehicles_vehicle_id ON geofence_vehicles(vehicle_id);

-- -----------------------------------------------------------------------------
-- Add deferred FK from alerts.geofence_id to geofences.id
-- -----------------------------------------------------------------------------
ALTER TABLE alerts
    ADD CONSTRAINT fk_alerts_geofence
    FOREIGN KEY (geofence_id) REFERENCES geofences(id);

-- -----------------------------------------------------------------------------
-- maintenance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) REFERENCES vehicles(vehicle_id),
    maintenance_type maintenance_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    scheduled_date DATE,
    completed_date DATE,
    mileage_at_service INTEGER,
    next_service_mileage INTEGER,
    next_service_date DATE,
    cost DECIMAL(12,2),
    service_provider VARCHAR(200),
    status maintenance_status DEFAULT 'scheduled',
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled ON maintenance(scheduled_date);

CREATE TRIGGER trigger_maintenance_updated_at
    BEFORE UPDATE ON maintenance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
