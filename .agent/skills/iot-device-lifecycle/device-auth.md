# Device Authentication

> Trust no device by default. Every connection must prove identity, and every topic must be gated.

## Authentication at MQTT Level

```
Device authentication flow:
│
├── Device sends MQTT CONNECT packet
│   ├── client_id: device_id (unique per device)
│   ├── username: device_id (or customer-scoped identifier)
│   └── password: auth_token (generated at provisioning)
│
├── Broker validates credentials
│   ├── Check against internal database, HTTP backend, or file
│   ├── If valid: allow connection, apply ACL
│   └── If invalid: reject with CONNACK reason code
│
└── Post-authentication
    ├── Broker applies ACL rules (which topics this device can access)
    ├── Broker fires client.connected event
    └── Backend updates device session tracking
```

## Authentication Method Decision

```
Which authentication method?
│
├── Development / Prototype
│   ├── Username/Password (plain text over non-TLS)
│   ├── Simplest to set up
│   ├── device_id as username, auth_token as password
│   ├── EMQX built-in database or HTTP auth backend
│   └── Acceptable risk: local network only
│
├── Production (moderate security)
│   ├── Username/Password + TLS
│   ├── Same as above but encrypted transport
│   ├── TLS encrypts credentials in transit
│   ├── Server certificate on broker
│   ├── Good for: most commercial IoT deployments
│   └── Balance of security and operational simplicity
│
├── Production (high security)
│   ├── Client Certificates (X.509) + TLS
│   ├── Each device has unique certificate and private key
│   ├── Mutual TLS (mTLS): both sides verify identity
│   ├── No password needed (certificate IS the credential)
│   ├── Harder to provision (certificate distribution)
│   ├── Good for: healthcare, automotive, critical infrastructure
│   └── Requires PKI (Public Key Infrastructure) management
│
└── Enterprise / Regulated
    ├── MQTT 5.0 Enhanced Authentication
    ├── Challenge-response protocol (e.g., SCRAM)
    ├── Most secure, most complex
    ├── Good for: financial, government, military
    └── Requires MQTT 5.0 support on both device and broker
```

## Authentication Method Comparison

| Factor | Username/Password | Client Certificate | Enhanced Auth |
|--------|-------------------|-------------------|---------------|
| **Setup complexity** | Low | High | Very High |
| **Device provisioning** | Easy (flash token) | Hard (distribute cert) | Hard (configure SCRAM) |
| **Security level** | Moderate (with TLS) | High | Highest |
| **Credential rotation** | Easy (change password) | Hard (reissue cert) | Moderate |
| **Broker support** | All brokers | Most brokers | MQTT 5.0 only |
| **Resource on device** | Minimal | Moderate (TLS stack) | Moderate |
| **Best for** | Most projects | High-security | Regulated industries |

## EMQX Auth Chain

```
EMQX authentication chain:
│
├── Auth backend 1: Built-in database
│   ├── Check device_id/password against EMQX internal store
│   └── Result: allow / deny / not_found
│
├── Auth backend 2: HTTP backend (your API)
│   ├── POST /api/mqtt/auth with client_id, username, password
│   ├── Backend checks against PostgreSQL devices table
│   └── Result: allow / deny / not_found
│
├── Auth backend 3: Redis cache (optional)
│   ├── Check against cached credentials
│   └── Result: allow / deny / not_found
│
└── Chain logic:
    ├── Try backend 1 -> if "allow" -> authenticated
    ├── If "deny" -> rejected (stop chain)
    ├── If "not_found" -> try backend 2
    ├── If all backends return "not_found" -> rejected
    └── Order matters: put fastest/most common first
```

## ACL (Access Control List)

```
ACL principle: each device accesses ONLY its own topics.
│
├── Publish rules (device -> broker):
│   ├── ALLOW: v1/{client_id}/rawdata
│   ├── ALLOW: v1/{client_id}/status
│   ├── ALLOW: v1/{client_id}/event
│   ├── DENY: v1/{other_device_id}/*
│   └── DENY: $SYS/#
│
├── Subscribe rules (broker -> device):
│   ├── ALLOW: v1/{client_id}/command/#
│   ├── ALLOW: v1/{client_id}/config
│   ├── DENY: v1/{other_device_id}/#
│   └── DENY: # (wildcard all)
│
├── Bridge / internal service rules:
│   ├── ALLOW: v1/+/rawdata (subscribe to ALL devices)
│   ├── ALLOW: v1/+/status
│   ├── ALLOW: v1/+/command/# (publish commands to ANY device)
│   └── Bridge uses separate credentials with elevated ACL
│
└── ACL enforcement:
    ├── EMQX applies ACL after authentication
    ├── {client_id} placeholder substituted automatically
    └── Denied publish/subscribe: message silently dropped or PUBACK error
```

## Token Rotation

```
When to rotate device credentials:
│
├── Periodic rotation (recommended for long-lived devices)
│   ├── Schedule: every 90-180 days
│   ├── Flow: backend generates new token -> sends via MQTT command -> device updates -> old token revoked
│   ├── Grace period: accept both old and new token for N hours
│   └── Fallback: if device misses rotation, admin re-provisions manually
│
├── On-demand rotation (security event)
│   ├── Trigger: suspected compromise, employee departure, security audit
│   ├── Flow: admin rotates token -> device reconnects with new token
│   └── If device cannot receive new token: requires physical access
│
└── No rotation (acceptable in some cases)
    ├── Short-lived devices (< 1 year deployment)
    ├── Devices in physically secure locations
    └── When using client certificates (rotate cert instead)
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Shared password for all devices | One breach compromises entire fleet | Unique auth_token per device |
| No ACL configured | Any device reads/writes any topic | Strict per-device ACL with {client_id} substitution |
| No TLS in production | Credentials sent in plain text over network | Always enable TLS for production MQTT |
| Storing plain text tokens | Database breach exposes all credentials | Hash tokens with SHA-256 or bcrypt |
| Static credentials, never rotated | Long-term exposure risk | Implement periodic token rotation |
| Bridge uses device-level ACL | Bridge cannot subscribe to all topics | Separate bridge credentials with elevated permissions |
| No auth chain fallback | Single auth backend failure blocks all devices | Configure multiple backends in EMQX auth chain |
