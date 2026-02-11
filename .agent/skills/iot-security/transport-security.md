# Transport Security

> Encryption is not optional in production. Every byte between device and server, between browser and API, must be encrypted in transit.

---

## 1. TLS Strategy Decision

```
Which TLS strategy for which environment?
|
+-- Development (localhost)
|   +-- No TLS required
|   +-- MQTT on port 1883 (plain TCP)
|   +-- HTTP on port 3000 (plain HTTP)
|   +-- WebSocket on port 3000 (plain WS)
|   +-- Acceptable because: traffic never leaves the machine
|   +-- NEVER expose development ports to the internet
|
+-- Staging / UAT
|   +-- Self-signed certificates
|   +-- MQTT on port 8883 (TLS, self-signed)
|   +-- HTTPS via reverse proxy (self-signed)
|   +-- Tests TLS configuration without certificate cost
|   +-- Devices must trust self-signed CA
|
+-- Production
    +-- Real certificates (mandatory)
    +-- MQTT on port 8883 (TLS, Let's Encrypt or CA-signed)
    +-- HTTPS via Nginx Proxy Manager (Let's Encrypt auto-renewal)
    +-- WebSocket over HTTPS (WSS)
    +-- Disable plain ports entirely (1883 closed, HTTP redirects to HTTPS)
```

---

## 2. MQTT Transport Security

```
MQTT encryption layers:
|
+-- Plain MQTT (port 1883)
|   +-- No encryption
|   +-- Credentials visible to network sniffers
|   +-- Telemetry data readable by anyone on the network
|   +-- Use ONLY for: localhost development
|
+-- MQTT over TLS (port 8883)
|   +-- Server certificate: broker proves identity
|   +-- Encrypted channel: all data protected
|   +-- Client verifies server certificate
|   +-- Use for: staging and production
|
+-- MQTT over mTLS (mutual TLS)
    +-- Server certificate + client certificate
    +-- Both sides prove identity cryptographically
    +-- Strongest authentication (no passwords needed)
    +-- Use for: high-security deployments, regulated industries
    +-- Complexity: must manage per-device certificates
```

### EMQX TLS Configuration Strategy

| Setting | Development | Production |
|---------|-------------|------------|
| **TCP listener** | 0.0.0.0:1883 | Disabled or 127.0.0.1:1883 |
| **TLS listener** | Disabled | 0.0.0.0:8883 |
| **TLS version** | -- | TLSv1.2 minimum, prefer TLSv1.3 |
| **Cipher suites** | -- | Strong suites only, no RC4/DES/3DES |
| **Client verify** | -- | verify_none (server TLS) or verify_peer (mTLS) |
| **Certificate** | -- | Let's Encrypt or CA-signed |

---

## 3. HTTP/API Transport Security

```
API encryption strategy:
|
+-- Development
|   +-- Backend: HTTP on port 3000
|   +-- Frontend: HTTP on port 3002
|   +-- No reverse proxy needed
|
+-- Production
    +-- Nginx Proxy Manager (NPM) handles TLS termination
    |
    +-- Browser --> HTTPS (443) --> NPM --> HTTP (3002) --> Frontend
    +-- Browser --> HTTPS (443) --> NPM --> HTTP (3000) --> Backend API
    |
    +-- NPM responsibilities:
        +-- TLS termination (decrypt HTTPS, forward HTTP internally)
        +-- Let's Encrypt certificate provisioning and auto-renewal
        +-- HTTP to HTTPS redirect
        +-- Security headers injection
```

### Why TLS Termination at Reverse Proxy?

| Approach | Pros | Cons |
|----------|------|------|
| **TLS at reverse proxy** | Centralized cert management, simpler backend | Internal traffic unencrypted |
| **TLS at each service** | End-to-end encryption | Per-service cert management, complexity |
| **Both (re-encryption)** | Maximum security | Performance overhead, double cert management |

For most IoT projects: TLS at reverse proxy is sufficient. Internal traffic stays within Docker network (tracking-network), which is isolated.

---

## 4. Certificate Management

```
Certificate types and when to use:
|
+-- Let's Encrypt (production)
|   +-- Free, trusted by all clients
|   +-- Auto-renewal via ACME protocol
|   +-- 90-day validity, renewed at 60 days
|   +-- Managed by: Nginx Proxy Manager (built-in)
|   +-- Use for: server-side HTTPS and MQTT TLS
|
+-- CA-signed commercial (enterprise)
|   +-- Paid, extended validation available
|   +-- Longer validity (1-2 years)
|   +-- Use for: enterprise compliance requirements
|
+-- Self-signed (development/staging only)
|   +-- Free, no external dependency
|   +-- Not trusted by browsers or clients by default
|   +-- Must distribute CA cert to all clients
|   +-- Use for: testing TLS configuration
|   +-- NEVER use in production
|
+-- X.509 client certificates (mTLS)
    +-- Per-device certificate for mutual TLS
    +-- Device proves identity cryptographically
    +-- Requires PKI infrastructure (CA, enrollment, revocation)
    +-- Use for: high-security, regulated environments
    +-- Significant operational overhead
```

### Certificate Renewal Strategy

```
Renewal automation:
|
+-- HTTPS certificates (Let's Encrypt via NPM)
|   +-- Fully automatic
|   +-- NPM handles ACME challenge and renewal
|   +-- No manual intervention required
|   +-- Monitor: NPM dashboard for renewal status
|
+-- MQTT broker certificates
|   +-- Semi-automatic with scripting
|   +-- certbot renew + EMQX config reload
|   +-- Schedule: cron job every 30 days
|   +-- Test: verify EMQX picks up new cert after reload
|
+-- Client certificates (if using mTLS)
    +-- Manual or automated via device management
    +-- Track expiry per device
    +-- Push renewed cert via secure OTA
    +-- Plan: dual-cert window during rotation
```

---

## 5. WebSocket Security

```
WebSocket (Socket.IO) security:
|
+-- Development
|   +-- WS on port 3000 (same as API)
|   +-- No encryption
|
+-- Production
|   +-- WSS via reverse proxy (HTTPS upgrade)
|   +-- Session token validated on handshake
|   +-- Connection rejected if token invalid
|
+-- Handshake validation:
    +-- 1. Client initiates Socket.IO connection
    +-- 2. Client sends session token in auth payload
    +-- 3. Server middleware extracts token
    +-- 4. Server validates token (same as HTTP auth middleware)
    +-- 5. Valid --> connection established, user attached to socket
    +-- 6. Invalid --> connection rejected with 401
    +-- 7. Token expires during session --> server disconnects socket
```

### Socket.IO Security Checklist

| Check | Why |
|-------|-----|
| Validate token on every connection | Prevent unauthorized real-time access |
| Use WSS in production | Encrypt all real-time data |
| Restrict CORS origins | Prevent cross-origin WebSocket hijacking |
| Implement heartbeat timeout | Clean up stale connections |
| Rate limit events | Prevent event flooding |
| Validate event payloads | Prevent injection via WebSocket |

---

## 6. Network Segmentation

```
Docker network isolation:
|
+-- tracking-network (bridge network)
|   +-- All services communicate internally
|   +-- Services reference each other by container name
|   +-- No external access to internal ports
|
+-- Exposed ports (mapped to host):
|   +-- 1883/8883: MQTT broker (devices connect here)
|   +-- 3000: Backend API (or behind reverse proxy)
|   +-- 3002: Frontend (or behind reverse proxy)
|   +-- 18083: EMQX dashboard (restrict in production)
|
+-- NOT exposed (internal only):
    +-- 5432: PostgreSQL (only accessible from tracking-network)
    +-- 8428: VictoriaMetrics (only accessible from tracking-network)
    +-- 9428: VictoriaLogs (only accessible from tracking-network)
```

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| MQTT without TLS in production | Credentials and telemetry in plaintext | TLS on port 8883, disable 1883 |
| Self-signed certificates in production | Browser warnings, client trust issues | Let's Encrypt (free, trusted) |
| No certificate renewal automation | Certificates expire, services go down | Auto-renewal via NPM or certbot |
| Exposing database ports to internet | Direct database attacks | Docker internal network only |
| HTTP in production | Data interception, session hijacking | HTTPS via reverse proxy |
| No WebSocket auth | Unauthorized real-time data access | Validate session token on handshake |
| TLSv1.0 or TLSv1.1 | Known vulnerabilities | TLSv1.2 minimum, prefer TLSv1.3 |
| Wildcard certificate for everything | Compromised cert exposes all subdomains | Separate certs per service where practical |

---

> **Principle:** Transport security is the invisible shield. Users and devices never think about it when it works. But without it, every credential, every GPS coordinate, every command is readable by anyone on the network path. TLS in production is not a feature -- it is a requirement.
