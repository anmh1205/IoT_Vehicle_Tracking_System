# Broker Configuration

> The broker is infrastructure, not application code. Choose and configure wisely.

## Broker Selection

```
Which MQTT broker?
│
├── EMQX
│   ├── Feature-rich: dashboard, clustering, rule engine, ACL
│   ├── Built-in authentication chain (database, JWT, HTTP)
│   ├── Horizontal scaling with clustering
│   ├── Prometheus metrics endpoint
│   ├── Dashboard at port 18083
│   ├── Use when:
│   │   ├── Need web dashboard for monitoring
│   │   ├── Need fine-grained ACL
│   │   ├── Need clustering for HA
│   │   └── Production IoT systems
│   └── License: open source (Apache 2.0) + enterprise edition
│
├── Mosquitto
│   ├── Lightweight, single binary
│   ├── Low resource usage
│   ├── Simple file-based config
│   ├── Use when:
│   │   ├── Single node is sufficient
│   │   ├── Resource-constrained environment
│   │   ├── Simple ACL requirements
│   │   └── Development or small deployments
│   └── License: open source (EPL/EDL)
│
├── HiveMQ
│   ├── Enterprise-grade, commercial support
│   ├── Extensions marketplace
│   ├── Use when:
│   │   ├── Enterprise compliance requirements
│   │   ├── Need commercial SLA
│   │   └── Budget available for licensing
│   └── License: community edition (free) + enterprise (paid)
│
└── VerneMQ
    ├── Erlang-based, clustering support
    ├── Plugin system
    ├── Use when: need clustering without EMQX
    └── License: open source (Apache 2.0)
```

## EMQX Configuration Essentials

| Setting | Development | Production |
|---------|-------------|------------|
| **TCP Listener** | 1883 (no TLS) | 8883 (TLS required) |
| **WebSocket** | 8083 (ws://) | 8084 (wss://) |
| **Dashboard** | 18083 (enabled) | 18083 (IP-restricted or disabled) |
| **Max connections** | 1000 | Based on capacity planning |
| **Message rate limit** | Disabled | Per-client rate limiting |
| **Authentication** | Built-in database | External database or JWT |
| **Default password** | Changed from default | Strong, rotated |

## ACL (Access Control List)

```
ACL principles:
│
├── Least privilege: devices can ONLY access their own topics
│   ├── Device DEVICE_A can publish to:  v1/DEVICE_A/rawdata
│   ├── Device DEVICE_A can publish to:  v1/DEVICE_A/status
│   ├── Device DEVICE_A can subscribe to: v1/DEVICE_A/command/#
│   ├── Device DEVICE_A CANNOT access:   v1/DEVICE_B/*
│   └── Device DEVICE_A CANNOT access:   internal/#
│
├── Bridge service has broader access:
│   ├── Can subscribe to: v1/+/rawdata, v1/+/status, v1/+/error
│   ├── Can publish to: v1/+/command/# (for server-to-device)
│   └── Can subscribe to: internal/events/#
│
└── Admin/monitoring:
    ├── Full access for monitoring tools
    └── Restricted to specific IP ranges in production
```

## Authentication Chain

```
EMQX authentication options (in priority order):
│
├── 1. Built-in database
│   ├── Username/password stored in EMQX
│   ├── Simple, no external dependency
│   └── Good for: development, small deployments
│
├── 2. External database (PostgreSQL/MySQL)
│   ├── Credentials stored in application database
│   ├── Single source of truth for device credentials
│   └── Good for: production, device management integration
│
├── 3. JWT authentication
│   ├── Device presents JWT token as password
│   ├── Stateless verification
│   └── Good for: token-based systems, short-lived access
│
└── 4. HTTP authentication
    ├── EMQX calls external HTTP endpoint to verify
    ├── Maximum flexibility
    └── Good for: complex auth logic, multi-tenant
```

## Monitoring

```
What to monitor on the broker:
│
├── Connection metrics
│   ├── Connected clients count
│   ├── Connection rate (new connections/sec)
│   └── Disconnection rate and reasons
│
├── Message metrics
│   ├── Messages received/sec (from devices)
│   ├── Messages sent/sec (to subscribers)
│   ├── Message queue depth
│   └── Dropped messages count
│
├── Resource metrics
│   ├── Memory usage
│   ├── CPU usage
│   └── Network I/O
│
└── Alerting thresholds
    ├── Connected clients > 80% of max -> warn
    ├── Message queue depth > 10000 -> warn
    ├── Dropped messages > 0 -> investigate
    └── Memory > 80% -> scale or investigate
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| No ACL | Any device reads any topic, security breach | Device-level ACL from day one |
| Default passwords | Brute force attack, unauthorized access | Change all defaults before first deployment |
| No TLS in production | Messages in plaintext, MITM attacks | TLS on port 8883, disable 1883 in production |
| Dashboard exposed publicly | Unauthorized broker management | IP-restrict or VPN-only access |
| No monitoring | Silent failures, capacity issues | Prometheus metrics + alerting |
| Mosquitto for 10K+ devices | Single node bottleneck, no HA | Use EMQX or HiveMQ with clustering |
