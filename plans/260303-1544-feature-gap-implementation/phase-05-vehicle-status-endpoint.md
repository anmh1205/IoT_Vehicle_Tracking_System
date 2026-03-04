# Phase 5: Vehicle Status Endpoint

**Priority:** 🟡 Trung bình
**Status:** Pending
**Estimated effort:** 1-2 hours

## Context

Report yêu cầu `GET /vehicles/:id/status` — aggregated real-time status:
- Current location (lat, lon, speed, course)
- Device status (online/offline, battery, lastSeen)
- Active trip (if any)
- Active alerts

Currently requires 4 separate API calls from frontend.

## Related Code Files

**Create:**
- `Tracking_Backend/src/domain/vehicle/services/vehicle-status.service.ts`

**Modify:**
- `Tracking_Backend/src/api/controllers/vehicle.controller.ts` — add getVehicleStatus handler
- `Tracking_Backend/src/api/routes/vehicle.routes.ts` — add `GET /:id/status`

## Implementation Steps

1. Create service that queries: device (last position + status), active trip, recent alerts
2. Aggregate into single response object
3. Add route and controller handler
4. Compile check

## Response Shape

```json
{
  "vehicleId": "VEHICLE_001",
  "status": "active",
  "currentLocation": { "lat": 10.76, "lon": 106.66, "speed": 45, "course": 180, "timestamp": "..." },
  "device": { "status": "online", "lastSeen": "...", "batteryLevel": 85 },
  "currentTrip": { "id": 10, "status": "in_progress", "startTime": "...", "distanceKm": 12.5 },
  "activeAlerts": [{ "id": 5, "alertType": "speeding", "severity": "high" }]
}
```

## Success Criteria

- [ ] Single API call returns all vehicle real-time info
- [ ] Works when no active trip (currentTrip: null)
- [ ] Works when device offline
