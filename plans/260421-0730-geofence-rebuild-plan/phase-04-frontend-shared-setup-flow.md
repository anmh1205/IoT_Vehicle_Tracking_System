# Phase 04 — Frontend shared setup flow

## Context Links
- `./phase-02-backend-runtime-and-api.md`
- `./phase-03-realtime-and-alert-behavior.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/geofences/**/*`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/map/components/**/*`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/devices/components/device-detail-modal.tsx`

## Overview
- Priority: P1
- Status: pending
- Brief: Replace generic CRUD/binder UX with one compact setup experience shared across entry points.

## Key Insights
- One vehicle, one zone must be visible in every label, action, and empty state.
- Map page is the primary operational flow, but device modal must reuse the same setup component and API hooks.
- Separate implementations for map and modal will drift fast.

## Requirements
### Functional
- Open setup for selected vehicle from operations/map.
- Open same setup for selected vehicle from device detail modal.
- Support center source choice: current vehicle position or map click.
- Support radius input via compact slider + numeric input.
- Show current status: active zone summary, state badge, last update.
- Replace existing zone with clear confirmation only when destructive.

### Non-functional
- Compact, visually clean, mobile-friendly.
- Keyboard-accessible fallback when map click not used.
- Shared hooks/components to stay DRY.

## Architecture
### UX model
Create one shared `allowed-zone-setup-sheet` style component used by:
- operations map side panel / drawer / sheet launcher
- device detail modal action button

### Shared frontend modules
Recommended modules:
- `features/geofences/components/allowed-zone-setup-sheet.tsx`
- `features/geofences/components/allowed-zone-status-card.tsx`
- `features/geofences/components/allowed-zone-radius-field.tsx`
- `features/geofences/hooks/use-vehicle-allowed-zone.ts`
- `features/geofences/lib/allowed-zone-form.ts`

### Flow details
1. User selects vehicle.
2. Setup sheet opens with current allowed-zone summary.
3. User chooses center source:
   - `current vehicle position`: fetch preview center from latest telemetry snapshot; if telemetry is stale, still allow save with a clear warning that latest-known position is being used
   - `map click`: arm map pick mode, user clicks map, sheet updates preview
4. User adjusts radius.
5. Optional advanced section collapsed by default for alert mode/cooldown.
6. Save triggers shared upsert call.
7. UI refreshes map overlay + device status.
<!-- Updated: Validation Session 1 - stale telemetry does not block save; warn instead -->

### What to remove or demote
- Generic geofence create/edit form for this operational path.
- Multi-vehicle binder from primary user journey.
- Polygon/rectangle editing affordances from allowed-zone flow.
- Manual lat/lon as primary interaction; keep only as fallback if existing design system requires it.

## Related Code Files
### Likely modify
- `Tracking_Frontend/src/app/dashboard/operations/geofences/page.tsx`
- `Tracking_Frontend/src/features/geofences/components/geofence-form.tsx`
- `Tracking_Frontend/src/features/geofences/components/geofence-map-editor.tsx`
- `Tracking_Frontend/src/features/geofences/components/geofence-vehicle-binder.tsx`
- `Tracking_Frontend/src/features/map/components/tracking-map.tsx`
- `Tracking_Frontend/src/features/map/components/map-geofence-workspace.tsx`
- `Tracking_Frontend/src/features/map/components/map-selected-device-overlay.tsx`
- `Tracking_Frontend/src/features/devices/components/device-detail-modal.tsx`
- `Tracking_Frontend/src/lib/api/geofences.ts`

## Implementation Steps
1. Refactor API client and hooks around `vehicle allowed zone` DTOs.
2. Build shared setup sheet and status card.
3. Reuse existing map draft layer only for circle preview/pick mode; strip generic shape complexity from this flow.
4. Add entry CTA in device detail modal.
5. Reduce `/operations/geofences` into a lightweight summary page by vehicle/status that opens the same shared setup sheet, instead of keeping full generic CRUD/binder management.
<!-- Updated: Validation Session 1 - operations geofences stays as lightweight list page -->
6. Align empty states, labels, badges, and validation copy to the one-zone mental model.

## Todo List
- [ ] Create shared allowed-zone hook/client layer
- [ ] Create shared setup sheet/status components
- [ ] Add map pick integration
- [ ] Add device modal entry
- [ ] Remove/demote binder-centric UX

## Success Criteria
- Same setup flow is reused from both entry points.
- Operator can configure zone in a few steps without generic CRUD confusion.
- UI remains readable on mobile and keyboard-accessible on desktop.

## Risk Assessment
- Existing map workspace may carry too much legacy shape logic.
- Device modal space may be tight; may need sheet/drawer handoff instead of inline form.

## Security Considerations
- Do not expose edit controls to unauthorized roles.
- Keep location previews scoped to the selected authorized vehicle.

## Next Steps
- Validate end-to-end flows and then update docs.

## Unresolved questions
- Whether device-detail action opens embedded sub-modal or routes to shared map sheet. Recommendation: open same shared sheet/modal component from device detail for least navigation friction.
