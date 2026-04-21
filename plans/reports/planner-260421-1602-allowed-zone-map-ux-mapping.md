# Allowed-zone map UX mapping report

## Scope
Inspect current frontend seams for dedicated allowed-zone UX on operations/map. No code changes.

## Findings
- Entry CTA: `src/features/map/components/map-selected-device-overlay.tsx`
- Map orchestration: `src/features/map/components/tracking-map.tsx`
- Shared allowed-zone domain: `use-vehicle-allowed-zone.ts`, `allowed-zone-form.ts`, `allowed-zone-radius-field.tsx`, `allowed-zone-setup-sheet.tsx`
- Current bad seam: allowed-zone preview is transformed into a fake geofence draft and rendered by `map-geofence-draft-layer.tsx`
- Generic geofence workspace is separate and should stay separate: `map-geofence-workspace.tsx`

## Risks
- Draft-layer reuse couples allowed-zone UX to geofence draft behavior and auto-pan side effects
- `selectedDeviceId` vs required `vehicleId` mismatch remains an entry constraint
- Shared sheet reset/preview behavior can regress if map owns too much form state

## Recommendation
Keep API/hooks/form shared. Add a map-only allowed-zone overlay and click-pick layer. Keep sheet reusable for non-map pages. Keep generic geofence workspace untouched.

## Unresolved questions
- Should preview ignore `showGeofences` toggle?
- Should center changes auto-pan on map?
