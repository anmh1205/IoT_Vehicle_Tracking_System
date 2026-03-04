# Phase 2: Geofence Detection Logic

**Priority:** 🔴 Cao
**Status:** Pending
**Estimated effort:** 4-5 hours

## Context

- Geofence CRUD fully implemented (create/edit/delete circle+polygon, assign vehicles)
- NO runtime detection: no point-in-polygon check, no entry/exit events
- Report yêu cầu: real-time alert when vehicle enters/exits geofence

## Key Insights

- Detection should happen in **MQTT Bridge** (processes every GPS update)
- Need: load active geofences per device → check each GPS point → fire event on state change
- Two geofence types: circle (center+radius) and polygon (array of points)
- Must track previous state (inside/outside) to detect transitions, not just current position

## Architecture

```
MqttBridge rawdata.handler → geofence-checker.service
  1. Get device's assigned geofences (cache, refresh periodically)
  2. For each GPS update, check point-in-geofence
  3. Compare with previous state (in-memory cache)
  4. On state change → publishInternalEvent('geofence', { type: 'enter'|'exit', ... })
  5. Backend receives event → creates alert + violation (Phase 1)
```

## Related Code Files

**Create (MQTT Bridge):**
- `Tracking_MqttBridge/src/services/geofence-checker.service.ts` — point-in-polygon + circle check
- `Tracking_MqttBridge/src/cache/geofence-state.cache.ts` — per-device geofence state (inside/outside)

**Modify:**
- `Tracking_MqttBridge/src/handlers/rawdata.handler.ts` — add geofence check after GPS validation
- `Tracking_MqttBridge/src/infrastructure/database.ts` — add query to load geofences for device

**Backend (event consumer):**
- `Tracking_Backend/src/domain/alert/` — handle geofence_enter/geofence_exit alert creation

## Implementation Steps

1. Implement `pointInCircle(lat, lon, centerLat, centerLon, radiusKm)` — Haversine
2. Implement `pointInPolygon(lat, lon, polygon: [lat,lon][])` — ray casting algorithm
3. Create geofence state cache (Map<deviceId, Map<geofenceId, 'inside'|'outside'>>)
4. Load assigned geofences from DB (cache with TTL ~60s)
5. On each rawdata GPS update: check all assigned geofences
6. On state transition: publish internal event
7. Backend: listen for geofence events → create alert + violation
8. Test with simulator

## Algorithms

**Point in Circle:**
```ts
const pointInCircle = (lat, lon, cLat, cLon, radiusKm) => {
  return haversineKm(lat, lon, cLat, cLon) <= radiusKm;
};
```

**Point in Polygon (Ray Casting):**
```ts
const pointInPolygon = (lat, lon, polygon: [number,number][]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i], [yj, xj] = polygon[j];
    if ((yi > lon) !== (yj > lon) && lat < (xj - xi) * (lon - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};
```

## Success Criteria

- [ ] Circle geofence detection works (enter + exit)
- [ ] Polygon geofence detection works (enter + exit)
- [ ] State transitions fire events (not every GPS tick)
- [ ] Backend creates alert on geofence event
- [ ] Frontend shows geofence alerts in real-time
- [ ] No performance degradation on rawdata handler (<5ms added)

## Risk

- Geofence cache invalidation: when admin edits geofence, MQTT Bridge needs fresh data
- Large polygon with many vertices — performance concern (mitigate: limit vertices)
- GPS jitter near boundary — mitigate: add hysteresis (exit only after N consecutive out-of-bounds)
