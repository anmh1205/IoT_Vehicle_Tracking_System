# Bidirectional Communication

> IoT is not just ingestion. The server must talk back to devices.

## Command Flow

```
Server-to-device command lifecycle:
│
├── 1. Trigger (REST API, scheduled task, alert rule)
│   └── Backend receives command request
│
├── 2. Validate
│   ├── Device exists and is online?
│   ├── User authorized to send this command?
│   └── Command payload valid?
│
├── 3. Publish
│   ├── Backend publishes to: v1/{device_id}/command/{action}
│   ├── QoS 1 (must reach device at least once)
│   └── Store command in database with status = "pending"
│
├── 4. Device receives
│   ├── Device subscribed to: v1/{device_id}/command/#
│   ├── Processes command
│   └── Publishes ACK to: v1/{device_id}/command/ack
│
├── 5. Bridge receives ACK
│   ├── Update command status in database = "completed" or "failed"
│   ├── Emit WebSocket event to frontend
│   └── Log to VictoriaLogs
│
└── 6. Timeout handling
    ├── If no ACK within N seconds (e.g., 30s)
    ├── Mark command status = "timeout"
    ├── Retry logic (optional, depends on command type)
    └── Notify user of failure
```

## Command Types

| Command | Topic | Payload | ACK Expected |
|---------|-------|---------|-------------|
| **OTA firmware** | `v1/{id}/command/ota` | `{url, version, checksum}` | Yes (progress + completion) |
| **Config change** | `v1/{id}/command/config` | `{key, value}` | Yes (applied or rejected) |
| **Reboot** | `v1/{id}/command/reboot` | `{}` or `{delay_seconds}` | Yes (after reboot, reconnect) |
| **Data request** | `v1/{id}/command/request` | `{readings: ["gps", "obd2"]}` | Yes (on-demand data sent) |
| **Diagnostic** | `v1/{id}/command/diagnostic` | `{type: "self_test"}` | Yes (test results) |

## Acknowledgment Pattern

```
Simple ACK:
├── Device publishes to: v1/{device_id}/command/ack
├── Payload: {command_id, status, message?, timestamp}
├── Status values: "received", "in_progress", "completed", "failed"
└── Bridge matches command_id to pending command in database

Multi-step ACK (e.g., firmware update):
├── ACK 1: {status: "received", progress: 0}
├── ACK 2: {status: "in_progress", progress: 25}
├── ACK 3: {status: "in_progress", progress: 75}
├── ACK 4: {status: "completed", progress: 100, new_version: "1.3.0"}
└── Each ACK updates command record and emits WebSocket event
```

## Fire-and-Forget vs Request/Response

```
When to use each?
│
├── Fire-and-forget
│   ├── No ACK needed
│   ├── Command is idempotent (safe to repeat)
│   ├── Use for: config hints, non-critical suggestions
│   └── Simpler, but no confirmation
│
├── Request/Response (ACK pattern)
│   ├── ACK expected within timeout
│   ├── Command tracked in database
│   ├── Use for: firmware updates, reboot, critical config
│   └── More complex, but reliable
│
└── Decision:
    ├── "Does the user need to know if it worked?" -> Request/Response
    └── "Is it OK if the device ignores it?" -> Fire-and-forget
```

## MQTT 5.0 Features for Bidirectional

```
MQTT 5.0 improvements:
│
├── Response Topic (built-in request/response)
│   ├── Publisher sets "Response Topic" property in PUBLISH
│   ├── Receiver publishes response to that topic
│   ├── No need for separate ACK topic convention
│   └── Cleaner than manual ACK topics
│
├── Correlation Data
│   ├── Attach unique ID to request
│   ├── Response includes same correlation ID
│   ├── Match responses to requests without parsing payload
│   └── Useful for multiple concurrent commands to same device
│
├── Message Expiry Interval
│   ├── Command expires if device is offline too long
│   ├── Prevents stale commands executing when device reconnects
│   └── Set based on command type (reboot: 60s, config: 3600s)
│
└── User Properties
    ├── Key-value metadata on messages
    ├── Attach command priority, source, version
    └── Without bloating payload
```

## Shared Subscriptions

```
Scaling multiple bridge instances:
│
├── Problem: 3 bridge instances all subscribe to v1/+/rawdata
│   └── Each bridge receives ALL messages (tripled processing)
│
├── Solution: Shared subscriptions
│   ├── Subscribe to: $share/bridge-group/v1/+/rawdata
│   ├── Broker distributes messages across group members
│   ├── Each message processed by exactly one bridge
│   └── Automatic load balancing
│
├── When to use:
│   ├── Multiple bridge instances for HA
│   ├── High message volume needs horizontal scaling
│   └── Different bridge instances in different regions
│
└── Consideration:
    ├── Message ordering is NOT guaranteed across instances
    ├── State must be in shared storage (not in-process)
    └── Not all brokers support shared subscriptions (EMQX does)
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No ACK mechanism | Never know if command was executed | ACK topic with timeout |
| No timeout | Pending commands stay forever | Timeout + status update after N seconds |
| Blocking wait for response | Ties up server thread/connection | Async: publish command, process ACK in separate handler |
| Stale commands on reconnect | Device executes outdated command after long offline | MQTT 5.0 Message Expiry or timestamp check in device firmware |
| No command tracking | Cannot audit who sent what when | Store every command in database with status lifecycle |
| Same QoS for all commands | Overhead for non-critical, risk for critical | QoS 1 for critical commands, QoS 0 for suggestions |
