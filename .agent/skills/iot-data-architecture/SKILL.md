---
name: iot-data-architecture
description: Multi-database architecture for IoT. PostgreSQL + VictoriaMetrics + VictoriaLogs composable strategy. Schema patterns, time-series design, event logging, data lifecycle. Used when designing or modifying data layer.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# IoT Data Architecture

> **"Use the right database for the right job. Relational state in PostgreSQL, time-series metrics in VictoriaMetrics, event logs in VictoriaLogs. Never force one database to do everything."**

## Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

---

## Content Map

| File | Description | When to Read |
|------|-------------|--------------|
| `three-db-strategy.md` | Core principle: composable data architecture, decision matrix | Choosing where data belongs, starting data layer design |
| `postgresql-patterns.md` | Relational schema conventions, generic vs domain tables, migrations | Designing or reviewing PostgreSQL schema |
| `victoriametrics-patterns.md` | Metric naming, labels, write/query API, cardinality | Storing or querying time-series telemetry |
| `victorialogs-patterns.md` | Structured logging, event types, LogsQL queries | Storing or querying device events and audit trails |
| `downsampling-lifecycle.md` | Data retention, downsampling, cost optimization | Planning storage strategy, managing data growth |
| `migration-safety.md` | Safe ALTER strategies, numbered SQL files, rollback | Adding or modifying database schema in production |

---

## Related Skills

| Need | Skill |
|------|-------|
| Generic database design (indexing, normalization, ORM) | `@[skills/database-design]` |
| Backend domain-driven architecture | `@[skills/iot-backend-ddd]` |
| Docker infrastructure for databases | `@[skills/iot-docker-infra]` |
| MQTT data ingestion pipeline | `@[skills/iot-mqtt-pipeline]` |
| Project naming and structure | `@[skills/iot-project-pattern]` |

---

## Core Principle

**"Composable Data Architecture"** -- three databases, each purpose-built:

```
Data enters the system
|
+-- Is it relational state? (entities, relationships, config)
|   +-- PostgreSQL
|
+-- Is it a numeric measurement over time? (sensor readings, metrics)
|   +-- VictoriaMetrics
|
+-- Is it a discrete event? (connected, disconnected, error, audit)
    +-- VictoriaLogs
```

---

## Decision Checklist

Before designing or modifying the data layer:

- [ ] **Classified data type?** (relational state vs time-series vs event log)
- [ ] **Chosen correct database?** (not defaulting to PostgreSQL for everything)
- [ ] **Defined retention policy?** (how long to keep raw data, downsampled data)
- [ ] **Planned migration safety?** (reversible, non-destructive)
- [ ] **Checked label cardinality?** (VictoriaMetrics labels are low-cardinality)
- [ ] **Structured log events?** (JSON with standard fields, not free text)
- [ ] **Considered query patterns?** (schema serves the queries, not the other way)

---

## Anti-Patterns

**DON'T:**
- Store time-series data in PostgreSQL (does not scale at IoT volumes)
- Store relational state in VictoriaMetrics (no joins, no transactions)
- Use unstructured log messages (impossible to query reliably)
- Skip retention policies (storage grows without bound)
- Use high-cardinality labels in VictoriaMetrics (kills query performance)
- Put all data in one database "for simplicity" (creates a bottleneck)

**DO:**
- Route each data type to its purpose-built database
- Define retention and downsampling from day one
- Use structured JSON for all log events
- Keep VictoriaMetrics labels to device_id, device_type, customer_id
- Design PostgreSQL schema around query patterns, not entity shapes
- Plan migrations as reversible, additive changes
