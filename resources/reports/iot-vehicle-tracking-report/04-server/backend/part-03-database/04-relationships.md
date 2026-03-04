## PHẦN IX.4: DATABASE RELATIONSHIPS

**ER Diagram (Tóm Tắt) - Car Rental System:**

```
users (1) ──< (many) vehicles (owner)
users (1) ──< (many) customers (verified_by)
users (1) ──< (many) notifications
customers (1) ──< (many) trips
customers (1) ──< (many) bookings [Phase 2]
customers (1) ──< (many) reviews [Phase 2]
vehicles (1) ──< (1) devices
vehicles (1) ──< (many) trips
vehicles (1) ──< (many) alerts
vehicles (1) ──< (many) maintenance_records
vehicles (1) ──< (many) bookings [Phase 2]
vehicles (1) ──< (many) damage_reports [Phase 2]
vehicles (1) ──< (many) reviews [Phase 2]
vehicles (many) ──< (many) geofences (via vehicle_geofences)
bookings (1) ──< (1) rental_contracts [Phase 2]
bookings (1) ──< (many) payments [Phase 2]
bookings (1) ──< (1) trips [Phase 2]
bookings (1) ──< (many) alerts [Phase 2]
bookings (1) ──< (many) damage_reports [Phase 2]
bookings (1) ──< (1) reviews [Phase 2]
trips (1) ──< (many) trip_events
trips (1) ──< (many) stops
trips (1) ──< (many) violations
devices (1) ──< (many) commands
devices (1) ──< (many) device_configurations
devices (1) ──< (many) device_status_history
devices (1) ──< (many) connection_logs
```

