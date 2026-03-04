# Device Authentication

> Devices are not users. They run unattended firmware on hardware you may never physically touch again. Their auth must survive power cycles, network drops, and years of deployment.

---

## 1. Two Auth Domains

```
Authentication in an IoT system:
|
+-- User Authentication (handled by backend application)
|   +-- Human logs in with username + password
|   +-- Gets session token or JWT
|   +-- Used for: dashboard, API, management
|   +-- See: user-auth.md
|
+-- Device Authentication (handled by MQTT broker)
    +-- Device connects with client_id + username + password
    +-- Verified by EMQX auth chain
    +-- Used for: telemetry ingestion, command reception
    +-- THIS FILE
```

These two domains share NO credentials, NO tokens, NO auth logic. A user's session token never touches MQTT. A device's auth token never touches the HTTP API.

---

## 2. MQTT Device Credentials

```
Device connection parameters:
|
+-- client_id: device_id (e.g., "DEV001")
|   +-- Unique per device
|   +-- Used for session tracking by broker
|   +-- EMQX uses this for ACL matching
|
+-- username: device_id (same as client_id)
|   +-- Simplifies ACL rules (match username to topic)
|   +-- Some deployments use a separate username
|
+-- password: auth_token (random 32+ character string)
    +-- Generated during device provisioning
    +-- Stored hashed (SHA-256) in database
    +-- Flashed to device firmware or provisioned OTA
    +-- Never transmitted in plaintext over unencrypted channels
```

---

## 3. EMQX Authentication Chain

```
EMQX auth method selection:
|
+-- How many devices?
|   |
|   +-- Under 100 (small deployment)
|   |   +-- EMQX built-in database
|   |   +-- Manage via EMQX dashboard or REST API
|   |   +-- No external dependency
|   |
|   +-- 100 to 10,000 (medium deployment)
|   |   +-- External database (PostgreSQL)
|   |   +-- Single source of truth with application
|   |   +-- Device management integrated with backend
|   |   +-- Recommended for Vehicle Tracking
|   |
|   +-- 10,000+ (large deployment)
|       +-- HTTP authentication endpoint
|       +-- Maximum flexibility
|       +-- Custom logic (multi-tenant, rate limiting)
|       +-- Can add caching layer
|
+-- Need token-based short-lived access?
    +-- JWT authentication
    +-- Device presents JWT as password
    +-- Broker verifies signature without DB call
    +-- Good for: cloud-native, serverless auth
```

---

## 4. ACL (Access Control List)

The most critical security control for device isolation.

```
ACL principles:
|
+-- DENY ALL by default
|   +-- Device has NO access until explicitly granted
|
+-- Per-device topic permissions:
|   |
|   +-- Device DEV001 CAN publish to:
|   |   +-- v1/DEV001/rawdata       (telemetry data)
|   |   +-- v1/DEV001/status        (device status)
|   |   +-- v1/DEV001/error         (error reports)
|   |   +-- v1/DEV001/firmware/ack  (firmware acknowledgments)
|   |
|   +-- Device DEV001 CAN subscribe to:
|   |   +-- v1/DEV001/command/#     (commands from server)
|   |
|   +-- Device DEV001 CANNOT:
|       +-- v1/DEV002/*             (other device topics)
|       +-- v1/+/rawdata            (wildcard subscribe)
|       +-- internal/#              (broker internal topics)
|       +-- $SYS/#                  (system topics)
|
+-- Bridge service permissions:
|   +-- Subscribe: v1/+/rawdata, v1/+/status, v1/+/error
|   +-- Publish: v1/+/command/#
|   +-- Subscribe: internal/events/#
|   +-- Broader access, but still restricted
|
+-- Admin/monitoring:
    +-- Full access for operational tools
    +-- Restricted to specific IPs in production
```

### Why Topic Isolation Matters

| Without ACL | With ACL |
|-------------|----------|
| Device A reads Device B's GPS | Each device sees only its own topics |
| Compromised device spies on fleet | Compromised device is isolated |
| Rogue device sends fake commands | Only bridge can publish commands |
| Any client subscribes to everything | Wildcard subscribe blocked for devices |

---

## 5. Multi-Layer Security Model

```
Three layers, each independent:
|
+-- Layer 1: Network
|   +-- Firewall: only MQTT port exposed (1883 dev, 8883 prod)
|   +-- Docker network: broker on internal tracking-network
|   +-- VPN: for remote device management (production)
|   +-- IP allowlisting: restrict dashboard and admin access
|
+-- Layer 2: Transport
|   +-- TLS encryption: all data encrypted in transit
|   +-- Development: plain MQTT on 1883 (localhost only)
|   +-- Production: MQTT over TLS on 8883 (mandatory)
|   +-- See: transport-security.md
|
+-- Layer 3: Application
    +-- Username/password: per-device credentials
    +-- ACL: per-device topic permissions
    +-- Topic isolation: device cannot access other devices
    +-- Rate limiting: per-client message rate (EMQX built-in)
```

Each layer defends independently. If TLS is somehow bypassed, ACL still prevents unauthorized topic access. If ACL is misconfigured, network rules still limit exposure.

---

## 6. Credential Generation

```
Generating device credentials:
|
+-- Token generation
|   +-- Use: crypto.randomBytes(32).toString('hex')
|   +-- Result: 64-character hex string
|   +-- Entropy: 256 bits (computationally infeasible to guess)
|
+-- Storage
|   +-- Hash token with SHA-256 before storing in database
|   +-- Store hash in: devices table or device_credentials table
|   +-- Never store plain token in database
|   +-- Plain token given to device during provisioning (one-time)
|
+-- Per-device uniqueness
    +-- Every device gets its own unique token
    +-- NEVER reuse tokens across devices
    +-- NEVER use a shared/fleet-wide password
    +-- If one device is compromised, only that device is affected
```

---

## 7. Credential Rotation

```
When to rotate device credentials:
|
+-- Suspected compromise
|   +-- Rotate immediately
|   +-- Revoke old credential in broker
|   +-- Push new credential via secure OTA
|
+-- Scheduled rotation (long-lived deployments)
|   +-- Annual rotation for production fleets
|   +-- Coordinate with firmware update cycle
|   +-- Use dual-credential window (old + new valid during transition)
|
+-- Device replacement
|   +-- New device gets new credentials
|   +-- Old device's credentials revoked
|   +-- Never transfer credentials between physical devices
|
+-- Rotation process:
    +-- 1. Generate new token
    +-- 2. Add new token hash to broker (device now has two valid tokens)
    +-- 3. Push new token to device via secure command channel
    +-- 4. Device confirms new token works
    +-- 5. Remove old token hash from broker
    +-- 6. Window: both tokens valid for max 24 hours
```

---

## 8. Device Provisioning Security

```
How does the device get its first credential?
|
+-- Factory provisioning
|   +-- Credentials flashed during manufacturing
|   +-- Secure factory environment assumed
|   +-- Best for: mass production, controlled environment
|
+-- First-boot provisioning
|   +-- Device generates keypair on first boot
|   +-- Registers with provisioning server over TLS
|   +-- Server issues credential after identity verification
|   +-- Best for: field-deployed devices
|
+-- Manual provisioning
|   +-- Admin generates credential in dashboard
|   +-- Enters credential into device via USB/serial/BLE
|   +-- Best for: small deployments, prototype phase
|   +-- Used in: Vehicle Tracking System (via admin panel)
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Same password for all devices | One compromised device exposes entire fleet | Unique credential per device |
| No ACL configured | Any device can read/write any topic | Per-device ACL from day one |
| MQTT without TLS in production | Credentials transmitted in plaintext | TLS on port 8883 |
| Device credentials in source code | Git history exposes all device passwords | Environment variables or secure provisioning |
| No credential rotation plan | Long-lived credentials increase risk over time | Annual rotation or on-compromise rotation |
| Using user passwords for devices | Conflates two auth domains, complicates revocation | Separate credential systems |
| Wildcard ACL for devices | Device can subscribe to v1/+/# and spy on fleet | Restrict to own device_id only |
| Storing plain tokens in database | Database breach gives attacker usable credentials | SHA-256 hash before storage |

---

> **Principle:** A device deployed in the field is a physical asset outside your control. Assume it can be stolen, disassembled, and its firmware extracted. Per-device credentials with strict ACL ensure that compromising one device does not compromise the fleet.
