# Research Report: Event contract simplification for MQTT Bridge → Backend realtime → Frontend

**Timestamp:** 2026-03-31 17:00 Asia/Saigon
**Scope:** simplify event contracts only; no new architecture, no extra layers.

## Executive Summary
The codebase already has the right building blocks: MQTT Bridge publishes internal events, Backend re-emits them via Socket.IO, Frontend subscribes to realtime events. The main problem is not transport; it is contract drift: multiple event name styles, payload shapes, and namespace/event assumptions across layers.

Best simplification: keep the current pipeline, but make one canonical event vocabulary end-to-end. Use the same event key everywhere, keep one stable envelope, and remove aliasing/branching where possible. This reduces mismatch risk, makes subscriptions predictable, and lowers test surface.

## Research Methodology
- Sources consulted: 3 official docs + code inspection
- Date range: current repo state + stable docs
- Key search terms used: Socket.IO emit/listen, namespaces, rooms, React useEffect subscriptions, MQTT payload contract

## Key Findings

### 1) Current contract pain points
- MQTT Bridge emits `event_type` plus spread payload fields. Payload keys can collide with metadata.
- Backend maps internal event names to different Socket.IO names (`device.status.changed` → `device:status`, etc.).
- Frontend hook accepts any string event, so contract drift is easy and untyped.
- Some backend events use namespace-level broadcast, others target device rooms. This is fine, but event naming is inconsistent.

### 2) Simplified contract recommendation
Use one canonical event key and one envelope across Bridge → Backend → Frontend.
- Canonical event key: keep the internal event key as the public realtime event name.
- Canonical envelope: `{ correlation_id, event_type, timestamp, payload }`.
- Namespace is only for audience scoping (`/devices`, `/dashboard`, etc.), not for renaming events.
- Frontend subscribes to the exact canonical event key; no alias map in the UI.

### 3) Current pain → simplified contract
| Current pain | Simplified contract |
|---|---|
| Bridge spreads payload fields into top-level JSON | Always wrap business data in `payload` |
| Backend renames `device.status.changed` → `device:status` | Keep the same canonical event key end-to-end |
| Frontend accepts arbitrary string event names | Use a typed event registry with canonical keys only |
| Multiple naming styles (`:` vs `.` vs `_`) | One style only: dot-separated canonical keys |
| Branching by event family in subscription code | Namespace for routing only; no extra event aliases |

### 4) Best-practice alignment
Socket.IO docs recommend clear event naming, namespaces for separation, and rooms for targeted delivery. The repo already uses namespaces/rooms; the simplification is to stop translating event names unnecessarily.

### 5) Security / correctness notes
- Stable envelope prevents accidental overwrite of metadata fields.
- Correlation ID should stay intact across all layers for traceability.
- No client-side trust in arbitrary event names; only subscribe to approved canonical keys.
- Keep auth middleware and namespace separation unchanged.

## Implementation Recommendations

### Quick contract rule
1. Bridge publishes canonical event envelope.
2. Backend forwards same `event_type` as Socket.IO event name.
3. Frontend subscribes by canonical event key only.
4. Use namespace/room only for audience scope.

### Common pitfalls
- Mixing naming styles across layers.
- Allowing payload fields to collide with envelope fields.
- Adding alias maps in frontend hooks.
- Turning namespace separation into hidden event translation.

## Test Criteria
- Event name parity: same canonical key observed in Bridge log, Backend emit, Frontend listener.
- Payload shape: `correlation_id`, `event_type`, `timestamp`, `payload` always present.
- No alias drift: remove/disable colon- or snake-case event aliases in subscription paths.
- Subscription coverage: each canonical event has one backend emit path and one frontend listener path.
- Regression: device status, position, session start/end, ack, dashboard alerts all still arrive.

## Resources & References

### Official documentation
- Socket.IO emitting events: https://socket.io/docs/v4/emitting-events/
- Socket.IO namespaces: https://socket.io/docs/v4/namespaces/
- Socket.IO rooms: https://socket.io/docs/v4/rooms/
- React `useEffect`: https://react.dev/reference/react/useEffect

## Conclusion
Keep the existing architecture. Simplify the contract surface: one canonical event key, one stable envelope, namespaces only for routing. This is the lowest-risk way to cut mismatch bugs and reduce frontend/backend branching.

## Unresolved questions
- Should realtime canonical keys fully replace colon-style socket event names, or keep compatibility aliases for one release?
- Do all current MQTT Bridge publishers already include enough data to move to a strict `payload` envelope without code churn?
