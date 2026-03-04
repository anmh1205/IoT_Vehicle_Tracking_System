# Bridge Architecture

> The MQTT Bridge is the brain of your pipeline: subscribe, parse, validate, route, emit.

## What is an MQTT Bridge?

```
MQTT Bridge responsibilities:
├── Subscribe to broker topics
├── Receive raw device messages
├── Parse and validate payloads
├── Normalize to common schema
├── Route to appropriate storage
├── Emit real-time events (WebSocket, internal)
└── Handle errors gracefully (dead letter)
```

## Deployment Decision

```
How to deploy the bridge?
│
├── Standalone Service ({Prefix}_MqttBridge/)
│   ├── Separate process, own Docker container
│   ├── Independent scaling (scale bridge without scaling API)
│   ├── Isolated failures (bridge crash does not affect API)
│   ├── Own connection pool to databases
│   ├── Use when:
│   │   ├── High message volume (>1000 msg/sec)
│   │   ├── Multiple device types with complex parsing
│   │   ├── Need independent scaling
│   │   ├── Team wants separation of concerns
│   │   └── Production systems with uptime requirements
│   └── Example: Tracking_MqttBridge/ in vehicle tracking
│
└── Embedded in Backend (src/infrastructure/mqtt/ or src/mqtt-bridge/)
    ├── Same process as API server
    ├── Shared connection pool (fewer database connections)
    ├── Single deployment artifact
    ├── Simpler development and debugging
    ├── Use when:
    │   ├── Low message volume (<100 msg/sec)
    │   ├── Simple payload format (one device type)
    │   ├── Small team, want simplicity
    │   ├── Prototype or MVP stage
    │   └── Tight integration needed (e.g., trigger API events directly)
    └── Example: src/mqtt-bridge/ in IVM26
```

## Bridge Internal Structure

```
Standalone bridge layout:
├── src/
│   ├── index.ts                 # Entry point, connect broker
│   ├── config/                  # Environment, broker settings
│   ├── subscribers/             # Topic subscription handlers
│   │   ├── rawdata.subscriber.ts
│   │   ├── status.subscriber.ts
│   │   └── event.subscriber.ts
│   ├── parsers/                 # Device payload parsers
│   │   ├── parser.interface.ts
│   │   ├── json-parser.ts
│   │   └── parser-registry.ts
│   ├── storage/                 # Storage writers
│   │   ├── postgres.writer.ts
│   │   ├── victoriametrics.writer.ts
│   │   └── victorialogs.writer.ts
│   └── utils/                   # Logger, helpers
│       └── logger.ts
└── package.json
```

## Connection Management

| Aspect | Principle |
|--------|-----------|
| **Reconnection** | Exponential backoff with jitter (1s, 2s, 4s, 8s... max 60s) |
| **Keep-alive** | Set to 30-60s for IoT (detect stale connections) |
| **Clean session** | `false` for bridge (receive missed messages after reconnect) |
| **Client ID** | Stable, unique per bridge instance (e.g., `bridge-{hostname}`) |
| **Will message** | Publish to `internal/bridge/status` on unexpected disconnect |

## Reconnection Strategy

```
On disconnect:
├── Log disconnect reason
├── Start reconnection loop
│   ├── Attempt 1: wait 1s + random(0-500ms)
│   ├── Attempt 2: wait 2s + random(0-500ms)
│   ├── Attempt 3: wait 4s + random(0-500ms)
│   ├── ...doubles each time
│   └── Cap at 60s between attempts
├── On reconnect:
│   ├── Re-subscribe to all topics
│   ├── Log successful reconnection
│   └── Reset backoff timer
└── Never give up (bridge must always reconnect)
```

## Message Processing Pipeline

```
Message arrives from broker:
│
├── 1. Identify topic pattern
│   └── Which subscriber handles this topic?
│
├── 2. Parse payload
│   ├── Select parser based on device type or topic
│   └── Convert raw bytes/JSON to structured object
│
├── 3. Validate
│   ├── Required fields present?
│   ├── Values within expected ranges?
│   └── Timestamp reasonable? (not future, not too old)
│
├── 4. Normalize
│   └── Map to common NormalizedTelemetry schema
│
├── 5. Route to storage
│   ├── Time-series data -> VictoriaMetrics
│   ├── State changes -> PostgreSQL
│   └── Events/logs -> VictoriaLogs
│
├── 6. Emit events (optional)
│   └── WebSocket, internal event bus
│
└── 7. Error path
    ├── Parse failure -> dead letter topic
    └── Storage failure -> retry queue or log
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Processing MQTT in frontend | Security risk, scaling nightmare | Always use server-side bridge |
| No reconnection handling | Bridge stops after first disconnect | Exponential backoff, never give up |
| Clean session = true for bridge | Loses messages during reconnect | Use persistent session |
| One giant message handler | Unmaintainable, hard to test | Split into subscribers per topic pattern |
| Blocking processing | Slow parser blocks all messages | Async processing, queue if needed |
| No health check | Cannot detect stuck bridge | Heartbeat endpoint or periodic status publish |
