# Provisioning

> Every device enters the system through a gate. Make that gate deliberate, auditable, and scalable.

## Registration Flow

```
How a device enters the system:
│
├── 1. Admin creates device record
│   ├── Provide: device_id (unique), device_type, customer assignment
│   ├── Optional: label, description, metadata
│   └── System generates: auth_token, initial status = "registered"
│
├── 2. System generates credentials
│   ├── auth_token: cryptographically random (min 32 chars)
│   ├── Store hashed token in database (SHA-256 or bcrypt)
│   ├── Return plain token ONCE to admin (never stored in plain text)
│   └── Token is the device's password for MQTT connection
│
├── 3. Admin configures device hardware
│   ├── Flash firmware with: device_id, auth_token, broker URL
│   ├── Device is now ready to connect
│   └── Status transitions: registered -> provisioned
│
└── 4. Device connects for the first time
    ├── MQTT CONNECT with device_id as username, auth_token as password
    ├── Broker authenticates against stored credentials
    ├── Status transitions: provisioned -> active
    └── System records first_seen_at timestamp
```

## Registration Data Model

```
Minimum fields for device registration:
├── device_id          # Unique identifier (e.g., "DEV-001", MAC address, serial number)
├── device_type        # Category (e.g., "gps_tracker", "obd2", "vibration_sensor")
├── auth_token_hash    # Hashed credential (never store plain text)
├── customer_id        # Which customer owns this device (FK)
├── status             # Current lifecycle state (enum)
├── label              # Human-readable name ("Truck #42")
├── created_at         # When registered
├── first_seen_at      # When device first connected (null until first connect)
└── metadata           # JSONB for device-specific config (firmware target, etc.)
```

## Provisioning Method Decision

```
Which provisioning method?
│
├── Small fleet (< 50 devices)
│   ├── Manual registration via API or admin UI
│   ├── Admin creates one device at a time
│   ├── Simple, no tooling needed
│   ├── Good for: pilot deployments, testing
│   └── Endpoint: POST /api/v1/devices
│
├── Large fleet (50 - 1000 devices)
│   ├── CSV bulk import
│   ├── Admin uploads CSV with device_id, device_type, customer
│   ├── System validates all rows, creates devices in batch
│   ├── Returns CSV with generated auth_tokens (download once)
│   ├── Good for: fleet rollouts, customer onboarding
│   └── Endpoint: POST /api/v1/devices/bulk-import
│
└── Dynamic fleet (devices come and go frequently)
    ├── Auto-provisioning on first connect
    ├── Device presents pre-shared key (PSK) to broker
    ├── System creates device record automatically
    ├── Requires: PSK management, device_type detection
    ├── Good for: consumer IoT, devices sold to end users
    └── Mechanism: EMQX webhook on client.connected -> backend creates record
```

## Bulk Import Flow

```
CSV bulk import process:
│
├── 1. Admin uploads CSV file
│   ├── Required columns: device_id, device_type
│   ├── Optional columns: customer_id, label, metadata
│   └── Max file size: configurable (e.g., 10MB)
│
├── 2. System validates entire CSV
│   ├── Check: no duplicate device_ids within file
│   ├── Check: no conflict with existing device_ids in database
│   ├── Check: referenced customer_ids exist
│   ├── Check: device_type is valid enum value
│   └── If validation fails: return errors with row numbers, import nothing
│
├── 3. System creates all devices in transaction
│   ├── Generate auth_token for each device
│   ├── Insert all rows in single transaction (all or nothing)
│   └── Initial status: "registered" for all
│
└── 4. Return result CSV
    ├── Original columns + generated auth_token column
    ├── Admin downloads this file once
    ├── Tokens are used to configure device hardware
    └── File is NOT stored on server (security)
```

## Auto-Provisioning Flow

```
Auto-provisioning on first connect:
│
├── 1. Device connects to MQTT broker
│   ├── Username: device_id (e.g., from MAC address)
│   ├── Password: pre-shared key (PSK)
│   └── PSK is shared per customer or per device batch
│
├── 2. Broker authenticates PSK
│   ├── EMQX HTTP auth backend checks PSK validity
│   ├── If valid PSK: allow connection
│   └── If invalid: reject connection
│
├── 3. Broker fires client.connected webhook
│   ├── Backend receives: device_id, client_info
│   ├── Backend checks: does this device_id exist?
│   └── If not: create device record automatically
│
├── 4. Auto-created device record
│   ├── device_id: from MQTT client_id
│   ├── device_type: inferred from PSK group or default
│   ├── customer_id: from PSK mapping
│   ├── status: "active" (already connected)
│   └── auth_token: generate and store (for future reconnects)
│
└── 5. Admin reviews auto-provisioned devices
    ├── Dashboard shows newly registered devices
    ├── Admin can assign labels, adjust settings
    └── Admin can reject/decommission unwanted devices
```

## Device States After Provisioning

```
State flow after provisioning:
│
├── registered
│   ├── Device record exists in database
│   ├── Credentials generated but device never connected
│   └── Waiting for hardware configuration
│
├── provisioned
│   ├── Credentials delivered to device hardware
│   ├── Device is configured and ready to connect
│   └── Waiting for first MQTT connection
│
└── active
    ├── Device has connected at least once
    ├── first_seen_at is populated
    └── Device is part of the live fleet
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No unique device ID | Cannot distinguish devices, data integrity loss | Enforce unique constraint, use serial number or MAC |
| Shared credentials | One compromised device exposes all | Generate unique auth_token per device |
| Plain text token storage | Database breach exposes all credentials | Hash tokens before storage (SHA-256 minimum) |
| No validation on bulk import | Bad data enters system silently | Validate entire CSV before inserting any rows |
| Returning tokens multiple times | Increases exposure window | Return tokens exactly once at creation time |
| Hard-coded device IDs in firmware | Cannot reuse hardware, inflexible | Configure device_id at flash time, not compile time |
