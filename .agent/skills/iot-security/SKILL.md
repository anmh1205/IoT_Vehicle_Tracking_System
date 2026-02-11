---
name: iot-security
description: IoT security patterns. User authentication, device authentication, transport security, API protection, secrets management. Covers both web and MQTT security layers. Used when implementing or auditing security.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# IoT Security

> IoT security spans two worlds: user-facing web security AND device-facing MQTT security. Both must be airtight. A breach in either side compromises the entire system.
> **Learn to THINK about threat surfaces, not copy security config.**

## Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

---

## Content Map

| File | Description | When to Read |
|------|-------------|--------------|
| `user-auth.md` | Session-based vs JWT, password hashing, auth middleware, token storage | Implementing or reviewing user authentication |
| `device-auth.md` | MQTT credentials, EMQX auth chain, ACL, topic isolation, credential rotation | Implementing or reviewing device authentication |
| `transport-security.md` | TLS for MQTT and HTTP, certificate management, WebSocket security | Configuring encryption, reviewing transport layer |
| `api-protection.md` | Security headers, CORS, rate limiting, input validation, SQL injection, XSS | Hardening API endpoints, reviewing request handling |
| `secrets-management.md` | Environment variables, startup validation, password requirements, rotation | Managing credentials, reviewing secret handling |

---

## Related Skills

| Need | Skill |
|------|-------|
| MQTT broker configuration and ACL details | `@[skills/iot-mqtt-pipeline]` |
| Database schema for sessions and credentials | `@[skills/iot-data-architecture]` |
| Backend architecture and middleware patterns | `@[skills/iot-backend-ddd]` |
| Docker network and service isolation | `@[skills/iot-docker-infra]` |
| Generic vulnerability scanning methodology | `@[skills/vulnerability-scanner]` |
| API design and endpoint patterns | `@[skills/api-patterns]` |

---

## Core Principle

**"Two Authentication Domains"** -- IoT systems have two distinct auth surfaces that must be secured independently:

```
IoT Security Domains
|
+-- User Authentication (Web/API)
|   |
|   +-- Human users accessing dashboards and APIs
|   +-- Session-based or JWT tokens
|   +-- Browser-based, HTTPS transport
|   +-- Managed by backend application
|
+-- Device Authentication (MQTT)
    |
    +-- IoT devices connecting to broker
    +-- Username/password per device
    +-- MQTT over TLS transport
    +-- Managed by EMQX broker
```

A vulnerability in either domain can compromise the other. A stolen user session can reconfigure devices. A compromised device credential can flood the system with bad data.

---

## Decision Checklist

Before implementing or auditing security:

- [ ] **Chosen user auth strategy?** (session-based vs JWT, with clear reasoning)
- [ ] **Defined device auth method?** (EMQX built-in, external DB, or HTTP)
- [ ] **Configured ACL per device?** (topic isolation, least privilege)
- [ ] **Planned TLS strategy?** (dev vs staging vs production)
- [ ] **Set up security headers?** (Helmet, CORS, CSP)
- [ ] **Configured rate limiting?** (global, auth endpoints, per-user)
- [ ] **Validated all inputs?** (Zod schemas on every endpoint)
- [ ] **Secured all secrets?** (no defaults, no hardcoding, startup validation)
- [ ] **Token storage is memory-only?** (no localStorage, no cookies with secrets)
- [ ] **Password hashing uses bcrypt?** (cost factor 12+)

---

## Anti-Patterns

**DON'T:**
- Use the same auth mechanism for users and devices
- Store tokens in localStorage or unencrypted cookies
- Use default passwords in any environment beyond first local test
- Allow devices to access other devices' MQTT topics
- Skip TLS in production for "performance"
- Hardcode credentials in source code or Docker images
- Use string concatenation for SQL queries
- Trust client-side input without server validation
- Use wildcard CORS in production

**DO:**
- Treat user auth and device auth as separate security domains
- Store user tokens in memory only (Zustand, not persisted)
- Hash all passwords with bcrypt, all tokens with SHA-256 before storage
- Enforce per-device ACL at the broker level
- Use TLS for all production traffic (MQTT and HTTP)
- Validate all required secrets at application startup
- Use parameterized queries exclusively
- Validate every input with Zod before processing
- Rate-limit authentication endpoints aggressively

---

## Security Layers Summary

```
Layer 1: Network
├── Firewall rules, port restrictions
├── Docker network isolation (tracking-network)
└── No direct database exposure to internet

Layer 2: Transport
├── TLS for MQTT (port 8883 in production)
├── HTTPS for API (via Nginx Proxy Manager)
└── WSS for WebSocket (Socket.IO over HTTPS)

Layer 3: Authentication
├── User: session token or JWT verified per request
├── Device: username/password verified by EMQX
└── Both: credentials hashed before storage

Layer 4: Authorization
├── User: role-based access control (admin, operator, viewer)
├── Device: ACL per device (topic-level permissions)
└── API: endpoint-level permission checks

Layer 5: Input Validation
├── Zod schemas on every API endpoint
├── Parameterized SQL queries
└── Content-Security-Policy headers

Layer 6: Monitoring
├── Request-ID correlation across all layers
├── Failed auth attempt logging
└── Anomaly detection on device behavior
```
