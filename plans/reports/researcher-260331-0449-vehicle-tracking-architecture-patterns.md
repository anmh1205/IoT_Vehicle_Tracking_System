# Research Report: IoT Vehicle Tracking Architecture Patterns

**Timestamp:** 2026-03-31 04:49 Asia/Saigon
**Scope:** backend realtime, auth session/JWT, API client/frontend, socket/realtime

## Executive Summary

Kết luận ngắn: với hệ thống IoT vehicle tracking, kiến trúc đơn giản nhất mà vẫn đủ mạnh thường là **monolith có module rõ ràng + WebSocket cho realtime UI + MQTT ở biên/ingress cho device ingestion + Redis cho pub/sub/cache/session**. Nếu traffic chưa quá lớn, tránh nhảy thẳng sang microservices hay multi-broker phức tạp. Phần realtime phía frontend nên tách qua **BFF/API layer nhẹ** để gom dữ liệu, giảm round-trip, và kiểm soát auth/token refresh tập trung.

Trade-off chính: **WebSocket** cho UI cần bidirectional; **SSE** chỉ nên dùng nếu server-push là đủ; **MQTT bridge** hợp cho device-to-cloud, edge, fleet telemetry; **API Gateway/BFF** hợp để giảm coupling frontend-backend nhưng thêm 1 hop và thêm vận hành; **cache/session strategy** là “cheap win” để giảm DB load và ổn định auth/realtime fanout. Với mục tiêu “đơn giản hơn nhưng vẫn tăng tính năng/hiệu năng”, phương án tốt nhất thường là **1 backend chính + Redis + WebSocket + MQTT broker/bridge**, chưa cần split quá sớm.

## Research Methodology

- Sources consulted: 10+
- Date range of materials: mostly 2024-2026, with a few evergreen official docs
- Key search terms used:
  - WebSocket scaling Redis pub/sub sticky sessions
  - SSE vs WebSocket
  - MQTT bridge IoT tracking
  - API Gateway BFF authentication JWT session
  - production-grade open source vehicle tracking MQTT realtime

## Key Findings

### 1. Technology Overview

#### A. WebSocket scaling
- Best when UI needs low-latency bidirectional updates: live map, driver status, alerts, geo-fence events.
- Production pattern: horizontal app servers + shared backplane (Redis Pub/Sub, Kafka, NATS) + load balancer affinity or stateless connection routing.
- Main constraint: connection state and fanout. If mỗi node giữ state riêng mà không có backplane, multi-node fail nhanh.

#### B. SSE
- Best when traffic is mostly server-to-client: map refresh, trip progress, incident stream, dashboard metrics.
- Simpler than WebSocket: HTTP-based, auto-reconnect, easier through proxies/CDNs, less app complexity.
- Hard limit: no native client-to-server channel. For commands/ack, bạn phải thêm REST/POST side channel.

#### C. MQTT bridge
- Best fit for IoT device ingestion, especially vehicles/devices with unreliable networks.
- Strong pattern: device -> MQTT broker -> bridge/integration -> backend store/stream -> frontend realtime.
- MQTT 5 adds richer metadata, QoS options, retain, session expiry. Good for telemetry and intermittent connectivity.
- Not ideal as the direct browser protocol unless you intentionally want MQTT over WebSocket and accept extra complexity.

#### D. Cache/session strategy
- Redis session cache or token introspection cache cuts DB hits and smooths login/token refresh.
- For vehicle tracking, cache hot objects: active vehicle state, latest location, permission maps, websocket room membership.
- Risk: stale data if TTL/invalidation is sloppy. Need short TTL + explicit invalidation on role/device change.

#### E. API Gateway / BFF
- Gateway: cross-cutting concerns at edge (auth, rate limit, routing, observability).
- BFF: client-specific shaping. Good for web app that needs composite view (vehicle list + latest GPS + trip stats + permission scope).
- Adds one extra hop and one more service to run. Use only if frontend orchestration is already painful.

### 2. Current State & Trends

- Industry trend vẫn là “**use the simplest realtime primitive that matches the direction of traffic**”.
  - server-to-client only -> SSE
  - bidirectional interactive UI -> WebSocket
  - device telemetry -> MQTT
- For IoT, MQTT brokers like EMQX/HiveMQ/NanoMQ are mature and production-oriented; bridge patterns are now mainstream for edge/cloud split.
- WebSocket scaling guidance converges on Redis/Kafka/NATS backplane + state minimization.
- BFF is mature but often overused. If frontend has only 1 web client, a thin BFF may be enough; separate BFFs per client only when web/mobile/admin diverge strongly.

### 3. Best Practices

1. **Keep realtime stateless at app layer**
   - Store only ephemeral connection metadata in Redis.
   - Do not keep critical business state in memory.

2. **Use MQTT for ingestion, WebSocket/SSE for UI**
   - Device side and browser side are different problems.
   - Do not force one protocol for everything.

3. **Use Redis as shared coordination layer**
   - pub/sub for fanout
   - cache for hot reads
   - session/token metadata when needed

4. **Prefer thin BFF over deep gateway logic**
   - BFF should aggregate and shape responses, not re-implement domain logic.

5. **Short TTL, explicit invalidation**
   - login/session cache
   - permission cache
   - latest location cache

6. **Backpressure and rate limit telemetry**
   - throttle per device and per tenant
   - drop/compact duplicate location updates if needed

### 4. Security Considerations

- JWT only: simple, but revocation is weak unless you add blacklist/versioning.
- Session or hybrid session+JWT: better control for admin web app; use short-lived access token + refresh token.
- For IoT devices, prefer device credentials/mTLS or per-device keys; do not reuse human JWT model for devices unless absolutely necessary.
- WebSocket auth must be validated on handshake and revalidated on token refresh/reconnect.
- MQTT topics must be tenant-scoped; unauthorized wildcard subscriptions are a common leak.
- Never trust client-side location updates for authorization decisions.

### 5. Performance Insights

Relative trade-off table:

| Pattern | Latency | Operational complexity | Infra cost | Notes |
|---|---:|---:|---:|---|
| SSE | Low for server->client | Low | Low | Cheapest if one-way updates are enough |
| WebSocket + Redis backplane | Very low | Medium | Medium | Best for live map + commands |
| MQTT bridge | Very low at device edge | Medium-High | Medium | Best for ingestion, not browser UI |
| API Gateway/BFF | Low-Medium | Medium | Medium | Useful for shaping/composition |
| Cache/session strategy | Lowers overall latency | Low-Medium | Low | High ROI if hot reads dominate |

Quantitative relative guidance, not hard numbers:
- SSE vs WebSocket for UI-only updates: SSE usually ~10-30% less app complexity, but loses bidirectional capability.
- Redis-backed WebSocket fanout: usually far cheaper than adding Kafka if you only need ephemeral realtime updates and not durable event log.
- MQTT broker adds value when device count or flaky links matter; overkill if only backend-to-backend telemetry.

## Comparative Analysis

### 1) WebSocket scaling
**Use when:** live map, alarms, dispatcher chat, command/ack.

**Pros:**
- true bidirectional
- low latency
- good UX for interactive operations

**Cons:**
- connection lifecycle + auth refresh complexity
- multi-node scaling needs backplane/sticky strategy
- memory cost per connection

**Verdict:** keep if UI commands/ack are important.

### 2) SSE
**Use when:** dashboard, read-only live feeds, trip progress.

**Pros:**
- simplest realtime push
- resilient reconnect
- HTTP-friendly

**Cons:**
- no client-to-server channel
- not ideal if you need command/response

**Verdict:** best simplification lever if frontend mostly consumes telemetry.

### 3) MQTT bridge
**Use when:** vehicle/device telemetry and unreliable connectivity.

**Pros:**
- purpose-built for IoT
- QoS, retain, session semantics
- broker ecosystem mature

**Cons:**
- extra infra and operations
- browser integration not as clean as HTTP/SSE/WS

**Verdict:** should sit at ingestion layer, not replace UI transport.

### 4) Cache/session strategy
**Use when:** auth, permission lookup, latest vehicle state are hot.

**Pros:**
- big latency reduction for small effort
- easy to add incrementally

**Cons:**
- staleness risk
- invalidation discipline required

**Verdict:** almost mandatory for production-ish tracking.

### 5) API Gateway / BFF
**Use when:** multiple clients or frontend orchestration is messy.

**Pros:**
- cleaner frontend
- central auth/rate limit/observability
- can aggregate vehicle/trip/permission data

**Cons:**
- extra hop
- extra service to maintain
- easy to over-engineer

**Verdict:** thin BFF only; do not create a “mini monolith” of duplicated business logic.

## Open Source References Worth Studying

### Production-grade or close
- EMQX — MQTT broker for large-scale IoT
- NanoMQ — lightweight MQTT broker/edge bridge
- HiveMQ Edge — protocol bridge/gateway
- Traccar — mature vehicle tracking platform, good domain reference
- OneUptime WebSocket scaling article and architecture notes
- WebSocket.org scaling guides
- Azure BFF pattern docs

### What to learn from them
- broker/bridge separation from app logic
- keeping device ingest protocol different from UI protocol
- explicit shared state backplane for realtime fanout
- narrow BFF responsibilities

## Anti-Patterns

1. **Use WebSocket for everything**
   - anti-pattern because it increases complexity without value for one-way streams.

2. **Store live vehicle state only in app memory**
   - breaks on scale-out/restart.

3. **JWT everywhere with no revocation strategy**
   - bad for admin sessions and permission changes.

4. **Run MQTT broker inside app process**
   - couples failure domains and makes scaling ugly.

5. **BFF full of business logic**
   - duplicates domain rules and creates hard-to-test shadow backend.

6. **Sticky sessions as the only scaling plan**
   - works short-term, but reduces resilience and flexibility.

7. **Chatty frontend**
   - many small requests for map+status+permissions instead of one shaped response.

## Recommendation

For this repo’s vehicle tracking use case, the simplest strong architecture is:

- **Device ingest:** MQTT broker or MQTT bridge at edge/integration layer
- **Backend core:** one main API service (keep modular monolith unless scale proves otherwise)
- **Realtime UI:** WebSocket for bidirectional operator actions; SSE for read-only live dashboards if command/ack is not needed
- **Shared infra:** Redis for cache, session metadata, and websocket fanout/backplane
- **Frontend:** thin BFF/API client layer to consolidate auth refresh and aggregate dashboard data

Practical rule:
- if user can only watch -> SSE
- if user can command/ack -> WebSocket
- if device talks to cloud -> MQTT
- if state is hot -> Redis
- if client-specific shaping hurts frontend -> thin BFF

This gives the best balance of simplicity, performance, and future scale.

## Resources & References

### Official / authoritative
- [Azure Architecture Center - Backends for Frontends](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends)
- [EMQX GitHub](https://github.com/emqx/emqx)
- [EMQX MQTT bridge docs](https://docs.emqx.com/en/emqx/latest/data-integration/data-bridge-mqtt.html)
- [NanoMQ project](https://lfedge.org/projects/nanomq/)
- [HiveMQ Edge](https://www.hivemq.com/products/hivemq-edge/)
- [MDN Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [WebSocket.org - WebSockets at scale](https://websocket.org/guides/websockets-at-scale/)
- [WebSocket.org - SSE comparison](https://websocket.org/comparisons/sse/)

### Production reference repos / projects
- [Traccar](https://github.com/traccar/traccar)
- [EMQX](https://github.com/emqx/emqx)
- [lanz-2024/realtime-dashboard](https://github.com/lanz-2024/realtime-dashboard)

### Articles / guides
- [Ably: Scaling Pub/Sub with WebSockets and Redis](https://ably.com/blog/scaling-pub-sub-with-websockets-and-redis)
- [OneUptime: WebSocket scaling with Redis Pub/Sub](https://oneuptime.com/blog/post/2026-01-24-websocket-scaling-redis-pubsub/view)
- [OneUptime: SSE vs WebSockets](https://oneuptime.com/blog/post/2026-01-27-sse-vs-websockets/)
- [FreeCodeCamp: SSE vs WebSockets](https://www.freecodecamp.org/news/server-sent-events-vs-websockets/)

## Appendices

### A. Glossary
- **BFF**: Backend for Frontend; API layer tailored to one client type.
- **Backplane**: shared message layer for fanout across app nodes.
- **QoS**: MQTT delivery guarantee level.
- **Sticky session**: LB keeps one client on one node.

### B. Version / fit matrix
- **Browser live map, read-only**: SSE or WebSocket
- **Browser live map + commands**: WebSocket
- **Vehicle telemetry ingestion**: MQTT
- **Hot auth/session lookup**: Redis cache/session store
- **Multiple client shapes**: thin BFF

### C. Raw notes
- The main theme across sources is consistent: keep protocol choice aligned with traffic direction and operational needs.
- Most complexity wins come from state management, not from the transport itself.
- Avoid over-splitting services before proving load or organizational need.

## Unresolved Questions

- Current repo traffic profile: number of devices, concurrent operators, update frequency.
- Need for command/ack from UI to vehicles?
- Is browser support for MQTT over WebSocket a requirement, or can UI stay on HTTP + WS/SSE?
- Is event durability/replay needed, or only latest state?
