# Topic Design

> Topics are your API contract with devices. Design them before writing code.

## Topic Hierarchy Principles

```
Decision: How to structure topics?
│
├── Flat (device/data)
│   ├── Simple, easy to parse
│   ├── Limited filtering
│   └── Use when: few data types, simple system
│
├── Hierarchical (version/device/datatype)
│   ├── Fine-grained subscriptions
│   ├── Wildcard filtering
│   └── Use when: multiple data types, need selective subscribe
│
└── Unified Namespace (UNS)
    ├── Enterprise-wide hierarchy (org/site/area/line/device)
    ├── Industrial IoT standard (ISA-95)
    └── Use when: factory/industrial, multiple sites, IT/OT convergence
```

## Standard Hierarchy Pattern

```
Uplink (device -> server):
├── v1/{device_id}/rawdata        # Periodic telemetry (GPS, OBD2, sensors)
├── v1/{device_id}/status         # Device status changes (online, battery, signal)
├── v1/{device_id}/error          # Device-reported errors
└── v1/{device_id}/firmware/ack   # Firmware update acknowledgments

Downlink (server -> device):
├── v1/{device_id}/command/ota      # Firmware update trigger
├── v1/{device_id}/command/config   # Configuration change
├── v1/{device_id}/command/reboot   # Remote reboot
└── v1/{device_id}/command/request  # Data request (on-demand reading)

Internal events (broker -> bridge):
├── internal/events/device/connected      # Client connected
├── internal/events/device/disconnected   # Client disconnected
└── internal/events/device/subscribed     # Client subscribed to topic
```

## Version Prefix

```
Why v1/ prefix?
├── Allows topic schema evolution without breaking devices
├── Bridge can subscribe to v1/# for current version
├── New version v2/# can run in parallel during migration
└── Devices on old firmware keep working on v1/
```

## Naming Rules

| Rule | Example | Why |
|------|---------|-----|
| Lowercase only | `v1/device123/rawdata` | Consistency, case-sensitive brokers |
| Slashes for hierarchy | `v1/{id}/command/ota` | Standard MQTT separator |
| No spaces | `raw-data` not `raw data` | Avoids encoding issues |
| No special chars | `rawdata` not `raw_data!` | Broker compatibility |
| Short but descriptive | `status` not `device_status_update` | Bandwidth on constrained devices |
| Device ID in path | `v1/{device_id}/...` | Per-device ACL, filtering |

## Wildcard Subscriptions

```
Bridge subscription patterns:
│
├── v1/+/rawdata          # All devices, rawdata only (+ = single level)
├── v1/+/status           # All devices, status only
├── v1/+/error            # All devices, errors only
├── v1/DEVICE123/#        # One device, all topics (# = multi level)
├── v1/#                  # Everything under v1 (use cautiously)
│
└── internal/events/#     # All broker events
```

## Topic Count Decision

```
How many topic levels?
│
├── Too few (device/data)
│   ├── Cannot filter by data type
│   └── Bridge must parse everything
│
├── Right balance (version/device/datatype)
│   ├── 3 levels for uplink
│   ├── 4 levels for commands (add action)
│   └── Wildcard filtering works well
│
└── Too many (org/site/area/line/device/sensor/reading/unit)
    ├── Complex ACL rules
    ├── Hard to maintain
    └── Only justified for industrial UNS
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Hardcoded device ID in topic name | Cannot reuse topic structure | Use `{device_id}` placeholder in design |
| Single topic for all data | No selective subscription, parsing overhead | Split by data type |
| Device type in topic | Topic changes when device is replaced | Use device ID, store type in registry |
| No version prefix | Cannot evolve topic schema | Add `v1/` prefix from day one |
| Spaces or uppercase | Inconsistency, encoding issues | Lowercase, hyphens only |
| Too deep nesting | Complex ACL, hard to maintain | Max 4 levels for IoT, 6 for UNS |
