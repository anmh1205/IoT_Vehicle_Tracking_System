---
name: iot-device-lifecycle
description: IoT device lifecycle management. Provisioning, authentication, session tracking, firmware OTA, telemetry processing, rule engine concepts. Used when building device management features.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# IoT Device Lifecycle

> **"A device is not just a row in a database. It is born, authenticated, monitored, updated, and eventually retired. Manage every stage deliberately."**

## Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

---

## Content Map

| File | Description | When to Read |
|------|-------------|--------------|
| `provisioning.md` | Registration flows, bulk import, auto-provisioning, device states | Adding devices to the system |
| `device-auth.md` | MQTT authentication, ACL, token rotation, certificate methods | Securing device connections |
| `session-tracking.md` | Online/offline detection, last-seen, session history, real-time status | Monitoring device connectivity |
| `firmware-ota.md` | OTA flow, deployment strategies, verification, rollback | Building firmware update features |
| `telemetry-processing.md` | Parse, validate, normalize, route, emit pipeline | Processing incoming device data |
| `rule-engine-concept.md` | Threshold rules, state change rules, actions, implementation approaches | Building alerting and automation |
| `state-machine.md` | Device states, transitions, suspension, decommissioning | Managing device lifecycle status |

---

## Related Skills

| Need | Skill |
|------|-------|
| MQTT topic design and bridge architecture | `@[skills/iot-mqtt-pipeline]` |
| Database schema for devices and telemetry | `@[skills/iot-data-architecture]` |
| Backend domain-driven architecture | `@[skills/iot-backend-ddd]` |
| API endpoints for device management | `@[skills/api-patterns]` |
| Security hardening for transport and auth | `@[skills/vulnerability-scanner]` |

---

## Decision Checklist

Before building device lifecycle features:

- [ ] **Chosen provisioning method?** (manual, bulk CSV, auto-provisioning)
- [ ] **Defined authentication strategy?** (username/password, certificates, enhanced auth)
- [ ] **Configured ACL?** (device topic isolation, no cross-device access)
- [ ] **Planned session tracking?** (webhook vs MQTT events, heartbeat timeout)
- [ ] **Designed OTA flow?** (deployment strategy, verification, rollback)
- [ ] **Mapped telemetry pipeline?** (parse, validate, normalize, route)
- [ ] **Defined alert rules?** (hardcoded vs configurable, debounce)
- [ ] **Defined device states?** (registered, provisioned, active, suspended, decommissioned)
- [ ] **Planned decommissioning?** (soft delete, credential revocation, data retention)

---

## Anti-Patterns

**DON'T:**
- Use shared credentials across multiple devices
- Allow devices to access other devices' MQTT topics (no ACL)
- Skip TLS in production MQTT connections
- Deploy firmware to entire fleet without staged rollout
- Hard-delete device records (lose historical data)
- Process telemetry without validation (accept any payload)
- Put rule evaluation logic in the frontend
- Poll device status instead of using event-driven detection
- Block the MQTT message thread with heavy processing

**DO:**
- Assign unique credentials per device from provisioning
- Enforce strict ACL so each device only sees its own topics
- Track device state transitions explicitly (state machine)
- Use staged OTA rollout for production firmware updates
- Soft-delete decommissioned devices, retain historical data
- Validate and normalize all telemetry at the ingestion boundary
- Use broker events or webhooks for online/offline detection
- Debounce alert triggers to avoid notification storms
