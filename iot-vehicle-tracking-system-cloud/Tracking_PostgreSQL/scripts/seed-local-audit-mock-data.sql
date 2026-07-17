-- =============================================================================
-- seed-local-audit-mock-data.sql
-- Idempotent dataset for local Docker test + audit
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

-- customers
INSERT INTO customers (customer_code, customer_type, name, email, phone, address, status, notes)
VALUES
  ('CUST-LOGI-001','company','Dong Sai Gon Logistics','ops@dsg.local','0901000101','Thu Duc, HCMC','active','mock-audit'),
  ('CUST-BUS-002','company','Mien Dong Passenger Coop','dispatch@md.local','0902000202','Binh Thanh, HCMC','active','mock-audit'),
  ('CUST-RETAIL-003','individual','Nguyen Hai Household','owner@nh.local','0903000303','District 7, HCMC','inactive','mock-audit')
ON CONFLICT (customer_code) DO UPDATE
SET name = EXCLUDED.name,
    customer_type = EXCLUDED.customer_type,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- drivers
INSERT INTO drivers (driver_code, full_name, phone, email, license_number, license_type, license_expiry, status, notes)
VALUES
  ('DRV-001','Nguyen Van Nam','0911000101','drv.nam@fleet.local','79B2-110011','B2',DATE '2028-06-30','active','mock-audit'),
  ('DRV-002','Tran Quoc Bao','0911000202','drv.bao@fleet.local','79D-220022','D',DATE '2027-12-15','active','mock-audit'),
  ('DRV-003','Le Minh Chau','0911000303','drv.chau@fleet.local','79B2-330033','B2',DATE '2026-09-30','inactive','mock-audit')
ON CONFLICT (driver_code) DO UPDATE
SET full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    license_number = EXCLUDED.license_number,
    license_type = EXCLUDED.license_type,
    license_expiry = EXCLUDED.license_expiry,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- devices
INSERT INTO devices (
  device_id, device_name, auth_token, current_status, last_seen_at,
  firmware_version, target_firmware_version, latitude, longitude,
  last_latitude, last_longitude, last_speed, total_runtime_seconds,
  imu_accel_delta_threshold_mps2, request_interval, is_active, config, last_error_code
)
VALUES
  ('TRACKER_001','Tracker Sedan 001','seed-token-tracker-001','running',NOW()-INTERVAL '2 minutes','v2.3.1','v2.4.0',10.775843,106.700981,10.775843,106.700981,42.5,158400,1.20,30,TRUE,'{"source":"mock-audit","driving":{"trackingIntervalSec":30,"tracking_interval_s":30},"parking":{"trackingIntervalSec":300,"tracking_interval_s":300,"heartbeatIntervalSec":900,"heartbeat_interval_s":900},"alerts":{"overspeedKph":80,"overspeed_kph":80,"imuAccelDeltaThresholdMps2":1.2,"imu_accel_delta_threshold_mps2":1.2,"offlineAfterSec":900,"offline_after_s":900}}'::jsonb,0),
  ('sim-uat-001','Simulator UAT 001','seed-token-sim-001','stopped',NOW()-INTERVAL '5 minutes','v2.1.9','v2.4.0',10.879015,106.809112,10.879015,106.809112,0,86420,1.00,60,TRUE,'{"source":"mock-audit","driving":{"trackingIntervalSec":60,"tracking_interval_s":60},"parking":{"trackingIntervalSec":600,"tracking_interval_s":600,"heartbeatIntervalSec":1800,"heartbeat_interval_s":1800},"alerts":{"overspeedKph":75,"overspeed_kph":75,"imuAccelDeltaThresholdMps2":1.0,"imu_accel_delta_threshold_mps2":1.0,"offlineAfterSec":1800,"offline_after_s":1800}}'::jsonb,0),
  ('MOCK-OBD-002','Bus Tracker 002','seed-token-bus-002','running',NOW()-INTERVAL '1 minutes','v2.3.1','v2.4.0',10.730644,106.719981,10.730644,106.719981,55.8,120560,1.35,20,TRUE,'{"source":"mock-audit","driving":{"trackingIntervalSec":20,"tracking_interval_s":20},"parking":{"trackingIntervalSec":180,"tracking_interval_s":180,"heartbeatIntervalSec":600,"heartbeat_interval_s":600},"alerts":{"overspeedKph":70,"overspeed_kph":70,"imuAccelDeltaThresholdMps2":1.35,"imu_accel_delta_threshold_mps2":1.35,"offlineAfterSec":600,"offline_after_s":600}}'::jsonb,0),
  ('MOCK-OBD-003','Van Tracker 003','seed-token-van-003','disconnected',NOW()-INTERVAL '18 minutes','v2.2.5','v2.4.0',10.733819,106.731205,10.733819,106.731205,0,49320,1.10,45,TRUE,'{"source":"mock-audit","driving":{"trackingIntervalSec":45,"tracking_interval_s":45},"parking":{"trackingIntervalSec":480,"tracking_interval_s":480,"heartbeatIntervalSec":1200,"heartbeat_interval_s":1200},"alerts":{"overspeedKph":85,"overspeed_kph":85,"imuAccelDeltaThresholdMps2":1.1,"imu_accel_delta_threshold_mps2":1.1,"offlineAfterSec":1200,"offline_after_s":1200}}'::jsonb,7)
ON CONFLICT (device_id) DO UPDATE
SET device_name = EXCLUDED.device_name,
    auth_token = EXCLUDED.auth_token,
    current_status = EXCLUDED.current_status,
    last_seen_at = EXCLUDED.last_seen_at,
    firmware_version = EXCLUDED.firmware_version,
    target_firmware_version = EXCLUDED.target_firmware_version,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    last_latitude = EXCLUDED.last_latitude,
    last_longitude = EXCLUDED.last_longitude,
    last_speed = EXCLUDED.last_speed,
    total_runtime_seconds = EXCLUDED.total_runtime_seconds,
    imu_accel_delta_threshold_mps2 = EXCLUDED.imu_accel_delta_threshold_mps2,
    request_interval = EXCLUDED.request_interval,
    is_active = EXCLUDED.is_active,
    config = EXCLUDED.config,
    last_error_code = EXCLUDED.last_error_code,
    updated_at = NOW();

-- vehicles
INSERT INTO vehicles (
  vehicle_id, plate_number, device_id, customer_id, vehicle_type,
  brand, model, year, transmission, fuel_type, mileage_km, status, color_hex, notes
)
VALUES
  ('XE-TEST','36E-04721','TRACKER_001',(SELECT id FROM customers WHERE customer_code='CUST-LOGI-001'),'sedan','Honda','Civic',2022,'automatic','gasoline',28350,'active','#2563EB','mock-audit'),
  ('XE-LOGI-01','51H-12890','sim-uat-001',(SELECT id FROM customers WHERE customer_code='CUST-LOGI-001'),'truck','Hyundai','HD120',2021,'manual','diesel',94210,'active','#0EA5E9','mock-audit'),
  ('XE-BUS-77','50F-77777','MOCK-OBD-002',(SELECT id FROM customers WHERE customer_code='CUST-BUS-002'),'van','Thaco','Town',2020,'manual','diesel',121340,'active','#DC2626','mock-audit'),
  ('XE-SHIP-09','59C-99009','MOCK-OBD-003',(SELECT id FROM customers WHERE customer_code='CUST-LOGI-001'),'pickup','Ford','Ranger',2023,'automatic','diesel',18420,'active','#475569','mock-audit')
ON CONFLICT (vehicle_id) DO UPDATE
SET plate_number = EXCLUDED.plate_number,
    device_id = EXCLUDED.device_id,
    customer_id = EXCLUDED.customer_id,
    vehicle_type = EXCLUDED.vehicle_type,
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    year = EXCLUDED.year,
    transmission = EXCLUDED.transmission,
    fuel_type = EXCLUDED.fuel_type,
    mileage_km = EXCLUDED.mileage_km,
    status = EXCLUDED.status,
    color_hex = EXCLUDED.color_hex,
    notes = EXCLUDED.notes,
    updated_at = NOW();

UPDATE devices d
SET vehicle_id = v.vehicle_id,
    updated_at = NOW()
FROM vehicles v
WHERE v.device_id = d.device_id
  AND v.device_id IN ('TRACKER_001','sim-uat-001','MOCK-OBD-002','MOCK-OBD-003');

INSERT INTO user_device_access (user_id, device_id, granted_by, granted_at)
SELECT u.id, d.device_id, 1, NOW()-INTERVAL '1 day'
FROM users u
JOIN devices d ON d.device_id IN ('TRACKER_001','MOCK-OBD-002','MOCK-OBD-003')
WHERE u.username = 'anmh1205'
ON CONFLICT (user_id, device_id) DO NOTHING;

-- cleanup/reseed for mock-only entities
DELETE FROM violations WHERE dedupe_key LIKE 'mock-audit-%';
DELETE FROM alerts WHERE title LIKE 'MOCK ALERT:%';
DELETE FROM maintenance WHERE title LIKE 'MOCK MTN:%';
DELETE FROM trips WHERE trip_code LIKE 'MOCK-TRIP-%';
DELETE FROM geofence_vehicles WHERE geofence_id IN (SELECT id FROM geofences WHERE name LIKE 'MOCK GF:%');
DELETE FROM geofences WHERE name LIKE 'MOCK GF:%';
DELETE FROM policy_audit_logs WHERE correlation_id LIKE 'mock-audit-%';
DELETE FROM event_logs WHERE correlation_id LIKE 'mock-audit-%';
DELETE FROM device_sessions WHERE start_correlation_id LIKE 'mock-audit-%';
DELETE FROM device_commands WHERE correlation_id LIKE 'mock-audit-cmd-%';

-- geofences
INSERT INTO geofences (name, description, geofence_type, center_latitude, center_longitude, radius_meters, trigger_on, is_active, notify_push, color, created_by)
VALUES
  ('MOCK GF: Thu Duc Warehouse','warehouse radius','circle',10.843145,106.759982,600,'both',TRUE,TRUE,'#2563EB',1),
  ('MOCK GF: Mien Dong Depot','depot polygon','polygon',NULL,NULL,NULL,'enter',TRUE,TRUE,'#DC2626',1),
  ('MOCK GF: Quan 7 Corridor','delivery corridor','rectangle',NULL,NULL,NULL,'exit',TRUE,TRUE,'#0EA5E9',1);

UPDATE geofences
SET coordinates = '{"type":"Polygon","coordinates":[[[106.8089,10.8785],[106.8214,10.8785],[106.8214,10.8912],[106.8089,10.8912],[106.8089,10.8785]]]}'::jsonb
WHERE name = 'MOCK GF: Mien Dong Depot';

UPDATE geofences
SET coordinates = '{"type":"Polygon","coordinates":[[[106.7043,10.7198],[106.7379,10.7198],[106.7379,10.7446],[106.7043,10.7446],[106.7043,10.7198]]]}'::jsonb
WHERE name = 'MOCK GF: Quan 7 Corridor';

INSERT INTO geofence_vehicles (geofence_id, vehicle_id, assigned_at)
SELECT g.id, v.vehicle_id, NOW()-INTERVAL '1 day'
FROM geofences g
JOIN (VALUES
  ('MOCK GF: Thu Duc Warehouse','XE-TEST'),
  ('MOCK GF: Thu Duc Warehouse','XE-SHIP-09'),
  ('MOCK GF: Mien Dong Depot','XE-BUS-77'),
  ('MOCK GF: Quan 7 Corridor','XE-BUS-77'),
  ('MOCK GF: Quan 7 Corridor','XE-LOGI-01')
) AS v(name, vehicle_id)
ON g.name = v.name;

-- policies + state (upsert by selecting existing row for same vehicle/policy_type)
DO $$
DECLARE
  p_id BIGINT;
BEGIN
  SELECT id INTO p_id FROM vehicle_policies WHERE vehicle_id='XE-SHIP-09' AND policy_type='RADIUS' ORDER BY id DESC LIMIT 1;
  IF p_id IS NULL THEN
    INSERT INTO vehicle_policies (vehicle_id, policy_type, status, params_json, effective_from, created_by, updated_by)
    VALUES ('XE-SHIP-09','RADIUS','active','{"centerLat":10.733819,"centerLon":106.731205,"radiusMeters":3200}'::jsonb,NOW()-INTERVAL '10 days',1,1)
    RETURNING id INTO p_id;
  ELSE
    UPDATE vehicle_policies SET status='active', params_json='{"centerLat":10.733819,"centerLon":106.731205,"radiusMeters":3200}'::jsonb, effective_from=NOW()-INTERVAL '10 days', effective_to=NULL, updated_by=1, updated_at=NOW() WHERE id=p_id;
  END IF;
  INSERT INTO vehicle_policy_state (vehicle_id, policy_id, spatial_state, quota_state, consumed_m, cycle_start_at, cycle_end_at, last_good_fix_at, last_evaluated_at, last_lat, last_lon, last_reason_code)
  VALUES ('XE-SHIP-09',p_id,'OUTSIDE','UNDER_LIMIT',6120,NOW()-INTERVAL '10 days',NOW()+INTERVAL '20 days',NOW()-INTERVAL '18 minutes',NOW()-INTERVAL '18 minutes',10.733819,106.731205,'GEOFENCE_EXIT')
  ON CONFLICT (vehicle_id, policy_id) DO UPDATE SET spatial_state=EXCLUDED.spatial_state, quota_state=EXCLUDED.quota_state, consumed_m=EXCLUDED.consumed_m, last_good_fix_at=EXCLUDED.last_good_fix_at, last_evaluated_at=EXCLUDED.last_evaluated_at, last_lat=EXCLUDED.last_lat, last_lon=EXCLUDED.last_lon, last_reason_code=EXCLUDED.last_reason_code, updated_at=NOW();

  SELECT id INTO p_id FROM vehicle_policies WHERE vehicle_id='XE-BUS-77' AND policy_type='DISTANCE_QUOTA' ORDER BY id DESC LIMIT 1;
  IF p_id IS NULL THEN
    INSERT INTO vehicle_policies (vehicle_id, policy_type, status, params_json, effective_from, effective_to, created_by, updated_by)
    VALUES ('XE-BUS-77','DISTANCE_QUOTA','active','{"limitKm":220,"cycle":"monthly"}'::jsonb,DATE_TRUNC('month',NOW()),DATE_TRUNC('month',NOW())+INTERVAL '1 month',1,1)
    RETURNING id INTO p_id;
  ELSE
    UPDATE vehicle_policies SET status='active', params_json='{"limitKm":220,"cycle":"monthly"}'::jsonb, effective_from=DATE_TRUNC('month',NOW()), effective_to=DATE_TRUNC('month',NOW())+INTERVAL '1 month', updated_by=1, updated_at=NOW() WHERE id=p_id;
  END IF;
  INSERT INTO vehicle_policy_state (vehicle_id, policy_id, spatial_state, quota_state, consumed_m, cycle_start_at, cycle_end_at, last_good_fix_at, last_evaluated_at, last_lat, last_lon, last_reason_code)
  VALUES ('XE-BUS-77',p_id,'INSIDE','NEAR_LIMIT',196400,DATE_TRUNC('month',NOW()),DATE_TRUNC('month',NOW())+INTERVAL '1 month',NOW()-INTERVAL '1 minute',NOW()-INTERVAL '1 minute',10.854221,106.771138,'QUOTA_89_PERCENT')
  ON CONFLICT (vehicle_id, policy_id) DO UPDATE SET spatial_state=EXCLUDED.spatial_state, quota_state=EXCLUDED.quota_state, consumed_m=EXCLUDED.consumed_m, last_good_fix_at=EXCLUDED.last_good_fix_at, last_evaluated_at=EXCLUDED.last_evaluated_at, last_lat=EXCLUDED.last_lat, last_lon=EXCLUDED.last_lon, last_reason_code=EXCLUDED.last_reason_code, updated_at=NOW();
END $$;

INSERT INTO policy_audit_logs (actor_id, action, policy_id, vehicle_id, after_json, correlation_id, ip_address, user_agent, created_at)
SELECT 1, 'policy_created', id, vehicle_id, params_json, 'mock-audit-policy-001', '127.0.0.1', 'seed-local-audit', NOW()-INTERVAL '2 days'
FROM vehicle_policies
WHERE vehicle_id='XE-BUS-77' AND policy_type='DISTANCE_QUOTA';

-- trips
INSERT INTO trips (
  trip_code, vehicle_id, device_id, driver_name, driver_phone,
  start_location, start_latitude, start_longitude,
  end_location, end_latitude, end_longitude,
  planned_start, planned_end, actual_start, actual_end,
  distance_km, fuel_used_liters, status, notes
)
VALUES
  ('MOCK-TRIP-001','XE-TEST','TRACKER_001','Nguyen Van Nam','0911000101','Thu Duc Warehouse',10.843145,106.759982,'District 1 Service Point',10.776881,106.701221,NOW()-INTERVAL '1 day 3 hours',NOW()-INTERVAL '1 day 2 hours',NOW()-INTERVAL '1 day 3 hours',NOW()-INTERVAL '1 day 1 hour 50 minutes',9.71,1.42,'completed','mock-audit'),
  ('MOCK-TRIP-002','XE-BUS-77','MOCK-OBD-002','Tran Quoc Bao','0911000202','Mien Dong Depot',10.854221,106.771138,'District 7 Transfer Hub',10.730644,106.719981,NOW()-INTERVAL '2 hours',NOW()+INTERVAL '40 minutes',NOW()-INTERVAL '90 minutes',NULL,36.2,6.4,'in_progress','mock-audit'),
  ('MOCK-TRIP-003','XE-SHIP-09','MOCK-OBD-003','Le Minh Chau','0911000303','District 7 Fulfillment',10.733819,106.731205,'Thu Duc Delivery Cluster',10.841664,106.790541,NOW()+INTERVAL '2 hours',NOW()+INTERVAL '3 hours 30 minutes',NULL,NULL,NULL,NULL,'planned','mock-audit'),
  ('MOCK-TRIP-004','XE-LOGI-01','sim-uat-001','Pham Thu An','0911000404','Thu Duc Warehouse',10.843145,106.759982,'Mien Dong Depot',10.878940,106.808778,NOW()-INTERVAL '4 days',NOW()-INTERVAL '4 days + 90 minutes',NULL,NULL,NULL,NULL,'cancelled','mock-audit'),
  ('MOCK-TRIP-005','XE-LOGI-01','sim-uat-001','Nguyen Van Nam','0911000101','Mien Dong Depot',10.878940,106.808778,'Thu Duc Warehouse',10.843145,106.759982,NOW()-INTERVAL '6 days 2 hours',NOW()-INTERVAL '6 days 20 minutes',NOW()-INTERVAL '6 days 2 hours',NOW()-INTERVAL '6 days 25 minutes',18.3,3.1,'completed','mock-audit');

-- alerts
INSERT INTO alerts (vehicle_id, device_id, trip_id, geofence_id, alert_type, severity, status, title, message, latitude, longitude, speed, threshold_value, actual_value, acknowledged_by, acknowledged_at, resolved_by, resolved_at, resolution_notes, created_at)
VALUES
  ('XE-BUS-77','MOCK-OBD-002',(SELECT id FROM trips WHERE trip_code='MOCK-TRIP-002'),(SELECT id FROM geofences WHERE name='MOCK GF: Quan 7 Corridor'),'speeding','high','active','MOCK ALERT: Speed threshold exceeded','Speed exceeded by 17 km/h',10.741220,106.723318,77,60,77,NULL,NULL,NULL,NULL,NULL,NOW()-INTERVAL '65 minutes'),
  ('XE-SHIP-09','MOCK-OBD-003',(SELECT id FROM trips WHERE trip_code='MOCK-TRIP-003'),(SELECT id FROM geofences WHERE name='MOCK GF: Thu Duc Warehouse'),'geofence_exit','medium','acknowledged','MOCK ALERT: Vehicle exited warehouse perimeter','Vehicle moved outside assigned radius',10.733819,106.731205,15,NULL,NULL,1,NOW()-INTERVAL '40 minutes',NULL,NULL,'Dispatch notified',NOW()-INTERVAL '45 minutes'),
  ('XE-LOGI-01','sim-uat-001',(SELECT id FROM trips WHERE trip_code='MOCK-TRIP-005'),NULL,'device_offline','critical','resolved','MOCK ALERT: Device offline during transfer','SIM link dropped for 12 minutes',10.878940,106.808778,0,NULL,NULL,1,NOW()-INTERVAL '7 hours 45 minutes',1,NOW()-INTERVAL '7 hours 20 minutes','Recovered after reconnect',NOW()-INTERVAL '8 hours'),
  ('XE-TEST','TRACKER_001',(SELECT id FROM trips WHERE trip_code='MOCK-TRIP-001'),NULL,'harsh_braking','low','active','MOCK ALERT: Harsh braking detected','Short harsh braking event',10.786512,106.719122,22,2.5,3.4,NULL,NULL,NULL,NULL,NULL,NOW()-INTERVAL '30 minutes'),
  ('XE-BUS-77','MOCK-OBD-002',(SELECT id FROM trips WHERE trip_code='MOCK-TRIP-002'),NULL,'maintenance_due','medium','active','MOCK ALERT: Brake maintenance due soon','Mileage crossed warning threshold',10.854221,106.771138,0,120000,121340,NULL,NULL,NULL,NULL,NULL,NOW()-INTERVAL '10 minutes');

INSERT INTO notification_states (user_id, alert_id, is_read, read_at, hidden_at)
VALUES
  (1, (SELECT id FROM alerts WHERE title='MOCK ALERT: Speed threshold exceeded'), TRUE, NOW()-INTERVAL '55 minutes', NULL),
  (1, (SELECT id FROM alerts WHERE title='MOCK ALERT: Vehicle exited warehouse perimeter'), TRUE, NOW()-INTERVAL '35 minutes', NULL),
  (1, (SELECT id FROM alerts WHERE title='MOCK ALERT: Device offline during transfer'), TRUE, NOW()-INTERVAL '7 hours 15 minutes', NOW()-INTERVAL '7 hours 10 minutes')
ON CONFLICT (user_id, alert_id) DO UPDATE
SET is_read = EXCLUDED.is_read,
    read_at = EXCLUDED.read_at,
    hidden_at = EXCLUDED.hidden_at,
    updated_at = NOW();

-- violations
INSERT INTO violations (alert_id, vehicle_id, driver_id, violation_type, policy_type, policy_id, severity, description, location_lat, location_lon, speed_limit, actual_speed, fine_amount, acknowledged, acknowledged_by, acknowledged_at, notes, dedupe_key, evidence_json, correlation_id, detected_at, confirmed_at, resolved_at)
VALUES
  ((SELECT id FROM alerts WHERE title='MOCK ALERT: Speed threshold exceeded'),'XE-BUS-77',3,'speeding',NULL,NULL,'high','Speed exceeded configured threshold',10.741220,106.723318,60,77,1500000,FALSE,NULL,NULL,'Pending driver explanation','mock-audit-viol-001','{"proof":"gps_telemetry"}'::jsonb,'mock-audit-corr-001',NOW()-INTERVAL '64 minutes',NOW()-INTERVAL '62 minutes',NULL),
  ((SELECT id FROM alerts WHERE title='MOCK ALERT: Vehicle exited warehouse perimeter'),'XE-SHIP-09',3,'policy_radius_exit','RADIUS',(SELECT id FROM vehicle_policies WHERE vehicle_id='XE-SHIP-09' AND policy_type='RADIUS' ORDER BY id DESC LIMIT 1),'medium','Vehicle left assigned operational radius',10.733819,106.731205,NULL,NULL,500000,TRUE,1,NOW()-INTERVAL '35 minutes','Dispatch approved temporary exception','mock-audit-viol-002','{"proof":"geofence_transition"}'::jsonb,'mock-audit-corr-002',NOW()-INTERVAL '44 minutes',NOW()-INTERVAL '42 minutes',NULL),
  ((SELECT id FROM alerts WHERE title='MOCK ALERT: Device offline during transfer'),'XE-LOGI-01',3,'policy_distance_quota_near_limit','DISTANCE_QUOTA',(SELECT id FROM vehicle_policies WHERE vehicle_id='XE-BUS-77' AND policy_type='DISTANCE_QUOTA' ORDER BY id DESC LIMIT 1),'low','Fleet quota warning',10.878940,106.808778,NULL,NULL,0,TRUE,1,NOW()-INTERVAL '7 hours 10 minutes','Informational warning only','mock-audit-viol-003','{"proof":"quota_cycle"}'::jsonb,'mock-audit-corr-003',NOW()-INTERVAL '7 hours 50 minutes',NOW()-INTERVAL '7 hours 45 minutes',NOW()-INTERVAL '7 hours 20 minutes');

-- maintenance
INSERT INTO maintenance (vehicle_id, maintenance_type, title, description, scheduled_date, completed_date, mileage_at_service, next_service_mileage, next_service_date, cost, service_provider, status, notes, created_by)
VALUES
  ('XE-BUS-77','brake_service','MOCK MTN: Bus brake pad replacement','Front axle pads near wear limit',CURRENT_DATE+2,NULL,121340,135000,CURRENT_DATE+80,3200000,'Binh Thanh Fleet Garage','scheduled','mock-audit',1),
  ('XE-SHIP-09','oil_change','MOCK MTN: Pickup oil and filter service','Routine service',CURRENT_DATE-1,NULL,18420,25000,CURRENT_DATE+45,1450000,'District 7 Service Center','in_progress','mock-audit',1),
  ('XE-LOGI-01','inspection','MOCK MTN: Truck monthly safety inspection','Checklist completed',CURRENT_DATE-6,CURRENT_DATE-5,94020,101000,CURRENT_DATE+25,900000,'Thu Duc Inspection Bay','completed','mock-audit',1);

-- sessions
INSERT INTO device_sessions (device_id, status, server_session_start, server_session_end, session_start, session_end, uptime, avg_imu_accel_delta_mps2, min_imu_accel_delta_mps2, max_imu_accel_delta_mps2, avg_vehicle_battery, avg_device_battery, data_points_count, last_update, start_correlation_id, end_correlation_id, last_latitude, last_longitude, last_speed)
VALUES
  ('TRACKER_001','completed',NOW()-INTERVAL '1 day 3 hours',NOW()-INTERVAL '1 day 1 hour 50 minutes',NOW()-INTERVAL '1 day 3 hours',NOW()-INTERVAL '1 day 1 hour 50 minutes',4200,1.26,0.44,2.10,12.5,4.08,260,NOW()-INTERVAL '1 day 1 hour 50 minutes','mock-audit-session-001','mock-audit-session-001-end',10.775843,106.700981,12.4),
  ('MOCK-OBD-002','running',NOW()-INTERVAL '90 minutes',NULL,NOW()-INTERVAL '90 minutes',NULL,5400,1.42,0.51,2.44,13.6,4.12,320,NOW()-INTERVAL '1 minute','mock-audit-session-002',NULL,10.730644,106.719981,55.8),
  ('MOCK-OBD-003','disconnected',NOW()-INTERVAL '2 hours 10 minutes',NOW()-INTERVAL '18 minutes',NOW()-INTERVAL '2 hours 10 minutes',NOW()-INTERVAL '18 minutes',6720,1.31,0.43,2.05,12.1,3.94,188,NOW()-INTERVAL '18 minutes','mock-audit-session-003','mock-audit-session-003-end',10.733819,106.731205,0);

-- command history
INSERT INTO device_commands (
  device_id, command, params, status, sent_at, acked_at, response, actor_user_id, correlation_id
)
VALUES
  (
    'TRACKER_001',
    'update_config',
    '{"tracking_interval_s":30,"parking_interval_s":300,"heartbeat_interval_s":900,"offline_after_s":900,"overspeed_kph":80}'::jsonb,
    'sent',
    NOW()-INTERVAL '42 minutes',
    NULL,
    NULL,
    1,
    'mock-audit-cmd-001'
  ),
  (
    'TRACKER_001',
    'request_location_snapshot',
    '{"reason":"ui_audit_check"}'::jsonb,
    'acknowledged',
    NOW()-INTERVAL '24 minutes',
    NOW()-INTERVAL '24 minutes' + INTERVAL '12 seconds',
    'snapshot queued',
    1,
    'mock-audit-cmd-002'
  ),
  (
    'MOCK-OBD-002',
    'update_config',
    '{"tracking_interval_s":20,"parking_interval_s":180,"heartbeat_interval_s":600,"overspeed_kph":70}'::jsonb,
    'sent',
    NOW()-INTERVAL '9 minutes',
    NULL,
    NULL,
    1,
    'mock-audit-cmd-003'
  ),
  (
    'MOCK-OBD-003',
    'ota_update',
    '{"version":"v2.4.0","force":false,"confirmTimeoutSec":180}'::jsonb,
    'failed',
    NOW()-INTERVAL '3 days',
    NULL,
    'device offline before confirm window',
    1,
    'mock-audit-cmd-004'
  );

-- event logs
WITH trip1_points AS (
  SELECT
    idx,
    NOW() - INTERVAL '1 day 3 hours' + (idx * INTERVAL '3 minutes') AS point_ts,
    ROUND((10.843145 - (idx * 0.00286) + SIN(idx / 2.4) * 0.00062)::numeric, 6) AS lat,
    ROUND((106.759982 - (idx * 0.00251) + COS(idx / 2.9) * 0.00054)::numeric, 6) AS lon,
    ROUND((24 + ABS(SIN(idx / 3.2)) * 28 + ((idx % 5) * 1.7))::numeric, 1) AS speed,
    ROUND((4.08 + ((idx % 4) * 0.03))::numeric, 2) AS device_battery,
    ROUND((12.58 - (idx * 0.008))::numeric, 2) AS vehicle_battery,
    ROUND((0.58 + ABS(SIN(idx / 4.1)) * 0.88)::numeric, 2) AS vibration,
    ROUND((81.5 + ABS(SIN(idx / 4.8)) * 11.2)::numeric, 1) AS temperature,
    MOD(214 + idx * 5, 360) AS heading
  FROM generate_series(0, 23) AS idx
)
INSERT INTO event_logs (
  correlation_id, device_id, session_id, event_type, event_code, severity, context,
  metadata, message, device_timestamp, server_timestamp, error_code, resolved_at,
  resolved_by, resolution_notes, error_status
)
SELECT
  'mock-audit-trip-001-' || LPAD(idx::text, 2, '0'),
  'TRACKER_001',
  (SELECT id FROM device_sessions WHERE start_correlation_id='mock-audit-session-001'),
  'status_change',
  'route_sample',
  'info',
  jsonb_build_object(
    'speed', speed,
    'device_battery', device_battery,
    'vehicle_battery', vehicle_battery,
    'vibration', vibration,
    'temperature', temperature,
    'latitude', lat,
    'longitude', lon,
    'course', heading
  ),
  jsonb_build_object(
    'tripCode', 'MOCK-TRIP-001',
    'sampleIndex', idx,
    'routeType', 'seeded_trip_replay'
  ),
  'Seeded replay waypoint for MOCK-TRIP-001',
  point_ts,
  point_ts,
  NULL,
  NULL,
  NULL,
  NULL,
  'resolved'
FROM trip1_points;

INSERT INTO event_logs (correlation_id, device_id, session_id, event_type, event_code, severity, context, metadata, message, device_timestamp, server_timestamp, error_code, resolved_at, resolved_by, resolution_notes, error_status)
VALUES
  ('mock-audit-evt-001','TRACKER_001',(SELECT id FROM device_sessions WHERE start_correlation_id='mock-audit-session-001'),'status_change','normal_run','info','{"speed":42.5,"device_battery":4.16,"vehicle_battery":12.48,"vibration":1.24,"temperature":88.4,"latitude":10.781221,"longitude":106.712334,"course":112}'::jsonb,'{"tripCode":"MOCK-TRIP-001"}'::jsonb,'Vehicle running stable on district route',NOW()-INTERVAL '32 minutes',NOW()-INTERVAL '32 minutes',NULL,NULL,NULL,NULL,'resolved'),
  ('mock-audit-evt-002','MOCK-OBD-002',(SELECT id FROM device_sessions WHERE start_correlation_id='mock-audit-session-002'),'warning','idle_too_long','warning','{"speed":0,"device_battery":4.09,"vehicle_battery":12.7,"vibration":0.32,"temperature":91.5,"latitude":10.854221,"longitude":106.771138,"course":225}'::jsonb,'{"tripCode":"MOCK-TRIP-002"}'::jsonb,'Idle too long at pickup point',NOW()-INTERVAL '14 minutes',NOW()-INTERVAL '14 minutes',NULL,NULL,NULL,NULL,'acknowledged'),
  ('mock-audit-evt-003','MOCK-OBD-003',(SELECT id FROM device_sessions WHERE start_correlation_id='mock-audit-session-003'),'connection','device_offline','error','{"speed":0,"device_battery":3.92,"vehicle_battery":12.1,"vibration":0,"temperature":39.8,"course":0}'::jsonb,'{"tripCode":"MOCK-TRIP-003"}'::jsonb,'Device offline for 12 minutes',NOW()-INTERVAL '17 minutes',NOW()-INTERVAL '17 minutes',7,NULL,NULL,NULL,'active'),
  ('mock-audit-evt-004','sim-uat-001',NULL,'status_change','session_end','info','{"speed":0,"device_battery":3.98,"vehicle_battery":12.2,"vibration":0.15,"temperature":33.2,"course":65}'::jsonb,'{"tripCode":"MOCK-TRIP-005"}'::jsonb,'Session ended after depot handover',NOW()-INTERVAL '7 hours',NOW()-INTERVAL '7 hours',NULL,NOW()-INTERVAL '6 hours 55 minutes',1,'Normal stop at depot','resolved'),
  ('mock-audit-evt-005','MOCK-OBD-002',(SELECT id FROM device_sessions WHERE start_correlation_id='mock-audit-session-002'),'error','dtc_pending','error','{"speed":18.4,"device_battery":4.04,"vehicle_battery":13.4,"vibration":0.91,"temperature":92.4,"latitude":10.823114,"longitude":106.756992,"course":188}'::jsonb,'{"tripCode":"MOCK-TRIP-002","dtc":"P0500"}'::jsonb,'Pending OBD fault P0500 detected during shuttle route',NOW()-INTERVAL '11 minutes',NOW()-INTERVAL '11 minutes',4,NULL,NULL,NULL,'active'),
  ('mock-audit-evt-006','TRACKER_001',(SELECT id FROM device_sessions WHERE start_correlation_id='mock-audit-session-001'),'warning','gps_signal_recovered','warning','{"speed":36.2,"device_battery":4.05,"vehicle_battery":12.36,"vibration":1.18,"temperature":84.0,"course":141}'::jsonb,'{"tripCode":"MOCK-TRIP-001","hint":"urban_canyon"}'::jsonb,'GPS jitter spike resolved after dense urban segment',NOW()-INTERVAL '1 day 2 hours 18 minutes',NOW()-INTERVAL '1 day 2 hours 18 minutes',8,NOW()-INTERVAL '1 day 2 hours 12 minutes',1,'Recovered on next valid fix','resolved'),
  ('mock-audit-evt-007','MOCK-OBD-002',(SELECT id FROM device_sessions WHERE start_correlation_id='mock-audit-session-002'),'status_change','obd_live_data','info','{"speed":32.7,"device_battery":4.08,"vehicle_battery":13.8,"vibration":1.04,"temperature":89.6,"latitude":10.794812,"longitude":106.744638,"course":197}'::jsonb,'{"tripCode":"MOCK-TRIP-002","sample":"mid-route"}'::jsonb,'Live OBD telemetry synced during corridor segment',NOW()-INTERVAL '8 minutes',NOW()-INTERVAL '8 minutes',NULL,NULL,NULL,NULL,'resolved'),
  ('mock-audit-evt-008','MOCK-OBD-002',(SELECT id FROM device_sessions WHERE start_correlation_id='mock-audit-session-002'),'status_change','obd_live_data','info','{"speed":46.2,"device_battery":4.07,"vehicle_battery":14.1,"vibration":1.22,"temperature":91.3,"latitude":10.762115,"longitude":106.731844,"course":214}'::jsonb,'{"tripCode":"MOCK-TRIP-002","sample":"urban-lane"}'::jsonb,'Live OBD telemetry updated near inner-city segment',NOW()-INTERVAL '5 minutes',NOW()-INTERVAL '5 minutes',NULL,NULL,NULL,NULL,'resolved'),
  ('mock-audit-evt-009','MOCK-OBD-002',(SELECT id FROM device_sessions WHERE start_correlation_id='mock-audit-session-002'),'status_change','obd_live_data','info','{"speed":55.8,"device_battery":4.05,"vehicle_battery":14.4,"vibration":1.37,"temperature":93.1,"latitude":10.730644,"longitude":106.719981,"course":233}'::jsonb,'{"tripCode":"MOCK-TRIP-002","sample":"latest"}'::jsonb,'Latest OBD telemetry sample matched with current device snapshot',NOW()-INTERVAL '1 minute',NOW()-INTERVAL '1 minute',NULL,NULL,NULL,NULL,'resolved'),
  ('mock-audit-evt-010','MOCK-OBD-002',(SELECT id FROM device_sessions WHERE start_correlation_id='mock-audit-session-002'),'status_change','mqtt_bridge_rawdata','info','{"source":"mqtt_bridge_rawdata","speed":55.8,"device_battery":4.05,"vehicle_battery":14.4,"vibration":1.37,"temperature":93.1,"latitude":10.730644,"longitude":106.719981,"course":233}'::jsonb,'{"tripCode":"MOCK-TRIP-002","ingestion":"mqtt-bridge"}'::jsonb,'Recent MQTT Bridge rawdata heartbeat for local audit runtime',NOW()-INTERVAL '30 seconds',NOW()-INTERVAL '30 seconds',NULL,NULL,NULL,NULL,'resolved');

COMMIT;
