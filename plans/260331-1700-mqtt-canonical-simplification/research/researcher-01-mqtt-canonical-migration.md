# Research Report: MQTT canonical path for simulator migration

**Timestamp:** 2026-03-31 17:00 Asia/Saigon

## Executive Summary
Migrate the simulator to publish on the same MQTT topics and payload shape as real devices, not through API ingest. This is the lowest-complexity path: one canonical ingress contract, one set of status semantics, less duplicated mapping, fewer edge cases.

Keep the current enum semantics unchanged: `online`, `offline`, `running`, `stopped`. Map them into MQTT status payloads, not into new infra. Use retained messages for current device/session state, and Last Will for broker-level offline detection. Do not introduce a second simulator-specific pipeline.

## Research Methodology
- Sources consulted: 4 public docs + current repo README
- Date range of materials: MQTT v5 spec + current EMQX/HiveMQ/AWS guidance
- Key search terms used: MQTT retained messages, session expiry, Last Will, topic hierarchy, device state, canonical MQTT path, EMQX best practices

## Key Findings

### 1. Canonical MQTT path is the right simplification
- MQTT is designed for device-to-broker publishing; keeping simulator on the same path as devices reduces special-case code.
- Current repo README already defines canonical topics: `v1/{device_id}/rawdata`, `status`, `events`, `firmware`, `commands`.
- Recommendation: simulator should emit the same topics + payload conventions as devices, then backend/bridge stays unchanged.

### 2. Status semantics should stay as payload state, not transport state
- Preserve enum values exactly: `online`, `offline`, `running`, `stopped`.
- Suggested mapping:
  - `online/offline` = connection/session presence
  - `running/stopped` = simulator/device activity state
- Avoid inventing new statuses or splitting state across API + MQTT.

### 3. Retained messages fit “current state” well
- MQTT retained messages deliver last known state to new subscribers immediately.
- This is useful for `status` topic so UI/backend can bootstrap without waiting for next telemetry tick.
- For state that must be instantly visible after reconnect, retained status is simpler than an API backfill path.

### 4. Last Will is the low-risk offline signal
- MQTT Last Will handles unexpected disconnects cleanly.
- Use it for broker-side `offline` publication on the status topic.
- This reduces dependence on API timeout polling or custom watchdog logic.

### 5. Session expiry / message expiry can stay default-simple
- MQTT 5 session expiry controls how long broker session state lives after disconnect.
- For simulator simplification, use the broker defaults or a short explicit session expiry only if the app needs queued commands.
- No need for a new service or state store.

## Comparative Analysis

### API ingest path
Pros:
- Familiar to app code
- Easy to debug with HTTP tools

Cons:
- Duplicates device semantics
- Requires translation layer
- Breaks canonical MQTT flow
- More branching, more maintenance

### MQTT canonical path
Pros:
- One path for simulator + real devices
- Matches existing architecture
- Easier status handling with retained + LWT
- Lower code complexity

Cons:
- Requires simulator to speak MQTT well
- Need careful topic/payload compatibility

Verdict: MQTT canonical path wins. API ingest should be treated as non-canonical or removed from simulator flow.

## Implementation Recommendations

### Low-risk migration plan
1. Keep topic names unchanged from device contract.
2. Move simulator publishing to MQTT only.
3. Keep payload schema stable; only adapt transport.
4. Publish status with retained flag.
5. Configure LWT for offline fallback.
6. Let backend/bridge consume the same topics it already expects.
7. Remove simulator-specific API ingest branch last, after parity is proven.

### Suggested state behavior
```text
online   -> connected and publishing status retained message
offline  -> LWT or explicit disconnect publication
running  -> active simulation loop
stopped  -> simulation paused/not producing telemetry
```

### Common pitfalls
- Do not mix API and MQTT as two equal ingress paths.
- Do not create a new simulator topic tree.
- Do not encode `running/stopped` only in transport state; keep it in payload.
- Do not rely on polling when retained message + LWT already solve the bootstrap/offline problem.

## Security and Reliability Notes
- Use existing MQTT auth/ACL model; no new infra needed.
- Keep topic scope per device/simulator identity.
- Use QoS 1 only where state correctness matters (`status`, events); keep high-frequency telemetry light.
- Keep retained payload small.

## References
- MQTT v5 spec: retained message semantics and session behavior
  - https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html
- EMQX retained message docs
  - https://docs.emqx.com/en/emqx/latest/messaging/mqtt-retained-message.html
- EMQX MQTT guide / advanced features
  - https://docs.emqx.com/en/emqx/latest/design/mqtt-guide.html
- HiveMQ retained messages explanation
  - https://www.hivemq.com/blog/mqtt-essentials-part-8-retained-messages/
- AWS MQTT topic design best practices
  - https://docs.aws.amazon.com/whitepapers/latest/designing-mqtt-topics-aws-iot-core/mqtt-design-best-practices.html
- Current repo canonical topic contract
  - README.md section “Data Flow and MQTT Contract”

## Low-risk migration checklist
- [ ] Confirm simulator topic names exactly match device contract
- [ ] Keep payload schema backward compatible
- [ ] Publish `status` as retained message
- [ ] Configure LWT for unexpected disconnect -> `offline`
- [ ] Keep `running/stopped` as payload field, not new topic
- [ ] Remove API ingest from simulator only after MQTT parity is verified
- [ ] Validate backend/bridge unchanged against simulator output
- [ ] Smoke test reconnect, retained replay, and offline detection

## Unresolved Questions
- Does the simulator need queued command handling via MQTT session expiry, or is stateless reconnect enough?
- Is there any hidden consumer still depending on simulator API ingest that must be migrated first?
