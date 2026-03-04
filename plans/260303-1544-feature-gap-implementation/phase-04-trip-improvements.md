# Phase 4: Trip Improvements

**Priority:** 🟡 Trung bình
**Status:** Pending
**Estimated effort:** 3-4 hours

## Context

Two improvements:
1. **Route interval param** — report yêu cầu `GET /trips/:id/route?interval=1m|5m|10m` — currently hardcoded `step=15s`
2. **Trip auto-detect** — auto start/end trip based on ignition ON/OFF events from device

## 4A: Route Interval Param

**Modify:**
- `Tracking_Backend/src/api/controllers/trip.controller.ts` — accept `interval` query param, map to VM step
- `Tracking_Backend/src/domain/trip/services/trip-waypoints.service.ts` — pass step param through

**Steps:**
1. Parse `interval` query param (default '15s', allowed: '15s','1m','5m','10m')
2. Pass to `getWaypoints()` as step parameter
3. Frontend: add interval selector dropdown in trip detail page

## 4B: Trip Auto-Detect

**Architecture:**
```
Device sends ignition ON/OFF → MQTT Bridge status.handler
  → publishInternalEvent('ignition', { device_id, state: 'on'|'off' })
  → Backend listens → auto createTrip (on IGN ON) / endTrip (on IGN OFF)
```

**Modify:**
- `Tracking_MqttBridge/src/handlers/rawdata.handler.ts` — detect ignition state change, publish event
- `Tracking_Backend/src/domain/trip/services/trip-auto.service.ts` — new: listen for ignition events, auto manage trips

**Steps:**
1. In rawdata handler: track previous ignition state per device
2. On ignition change ON→OFF or OFF→ON: publish internal event
3. Backend: new service subscribes to ignition events
4. On IGN ON: auto-create trip (status: in_progress, actual_start: now)
5. On IGN OFF: find active trip for device, auto-end with stats

## Success Criteria

- [ ] `GET /trips/:id/telemetry?interval=5m` returns lower-resolution route
- [ ] Ignition ON auto-creates trip
- [ ] Ignition OFF auto-ends trip with distance/duration stats
- [ ] Manual start/end still works alongside auto-detect
