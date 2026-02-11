---
name: iot-mqtt-pipeline
description: MQTT data pipeline for IoT systems. Topic design, bridge architecture, parser strategy, storage routing, QoS patterns. Used when building or modifying MQTT-based data ingestion.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# IoT MQTT Pipeline

> MQTT data pipeline patterns for IoT systems: Devices to Broker to Bridge to Storage.
> **Learn to THINK about data flow, not copy config files.**

## Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

---

## Content Map

| File | Description | When to Read |
|------|-------------|--------------|
| `topic-design.md` | Topic hierarchy, naming rules, wildcard usage | Designing MQTT topic structure |
| `bridge-architecture.md` | Standalone vs embedded bridge, connection management | Building or restructuring MQTT bridge |
| `parser-strategy.md` | Strategy Pattern for device parsers, normalization | Adding device support, parsing payloads |
| `storage-routing.md` | PostgreSQL vs VictoriaMetrics vs VictoriaLogs routing | Deciding where data goes |
| `qos-error-handling.md` | QoS levels, dead letters, reconnection, dedup | Reliability and error handling |
| `broker-config.md` | EMQX vs Mosquitto, ACL, monitoring | Broker selection and configuration |
| `bidirectional.md` | Server-to-device commands, ACK patterns, MQTT 5.0 | Building command/control features |

---

## Related Skills

| Need | Skill |
|------|-------|
| API layer on top of pipeline | `@[skills/api-patterns]` |
| Database schema for stored data | `@[skills/database-design]` |
| Node.js implementation details | `@[skills/nodejs-best-practices]` |
| Security for broker and transport | `@[skills/security-hardening]` |

---

## Decision Checklist

Before building an MQTT pipeline:

- [ ] **Defined topic hierarchy?** (flat vs hierarchical vs UNS)
- [ ] **Chosen bridge approach?** (standalone service vs embedded)
- [ ] **Identified device payload formats?** (single vs multi-parser)
- [ ] **Mapped data types to storage?** (state vs time-series vs events)
- [ ] **Selected QoS levels per message type?**
- [ ] **Planned error handling?** (dead letters, reconnection, dedup)
- [ ] **Configured broker ACL?** (device isolation, topic permissions)
- [ ] **Need bidirectional commands?** (server-to-device flow)

---

## Anti-Patterns

**DON'T:**
- Process MQTT messages directly in frontend code
- Use a single topic for all device data types
- Store time-series data in PostgreSQL
- Use QoS 2 for high-frequency sensor readings
- Skip reconnection handling in the bridge
- Allow devices to subscribe to other devices' topics (no ACL)
- Parse all device brands with a giant if/else chain

**DO:**
- Separate concerns: broker handles transport, bridge handles logic
- Design topic hierarchy before writing code
- Normalize payloads to a common schema regardless of device brand
- Route data to the right storage engine based on query patterns
- Use dead letter topics for unparseable messages
- Implement exponential backoff with jitter for reconnection
