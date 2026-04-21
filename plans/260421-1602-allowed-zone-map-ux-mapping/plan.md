---
title: "Allowed-zone map UX mapping"
description: "Map current frontend seams for a dedicated allowed-zone flow on operations/map without changing backend contract."
status: pending
priority: P2
effort: 1h
branch: feat/all-feat
tags: [frontend, map, geofence, allowed-zone]
created: 2026-04-21
---

# Overview

## Goal
Map current frontend touchpoints for a dedicated allowed-zone UX on operations/map that reuses existing allowed-zone API/hooks/form logic, stays separate from the generic geofence workspace, does not reuse `MapGeofenceDraftLayer`, and keeps `AllowedZoneSetupSheet` usable outside map pages.

## Phase mapping

1. `phase-01-entry-and-session`
   - Entry CTA lives in `src/features/map/components/map-selected-device-overlay.tsx`
   - Sheet mount + local orchestration live in `src/features/map/components/tracking-map.tsx`
   - Current local state: `allowedZoneOpen`, `allowedZoneMapPick`, `allowedZonePreview`

2. `phase-02-shared-allowed-zone-domain`
   - API + cache/realtime contract live in `src/features/geofences/hooks/use-vehicle-allowed-zone.ts`
   - Form schema/defaults/payload mapping live in `src/features/geofences/lib/allowed-zone-form.ts`
   - Radius control lives in `src/features/geofences/components/allowed-zone-radius-field.tsx`
   - Shared sheet stays in `src/features/geofences/components/allowed-zone-setup-sheet.tsx`

3. `phase-03-map-specific-preview-and-pick`
   - Current map pick/preview is piggybacked inside `tracking-map.tsx`
   - Wrong coupling today: allowed-zone preview is converted into a fake geofence draft and rendered by `src/features/map/components/map-geofence-draft-layer.tsx`
   - Target seam: new allowed-zone-specific map overlay/pick layer owned by map feature, not geofence workspace

4. `phase-04-isolation-from-geofence-workspace`
   - Generic geofence panel lives in `src/features/map/components/map-geofence-workspace.tsx`
   - Current map root already hides selected-device overlay when either `geofenceWorkspaceOpen` or `allowedZoneOpen`
   - Keep allowed-zone flow as sibling modal/layer state, not a branch of geofence workspace state

## Coupling points
- `tracking-map.tsx` currently couples three concerns: map canvas, geofence workspace, allowed-zone sheet orchestration
- `AllowedZoneSetupSheet` emits `onPreviewChange`, but knows nothing about Leaflet; this is good and should stay
- `AllowedZoneSetupSheet` also owns map-pick arm state (`mapPickArmed`), so map page must only translate click -> `mapPickValue`
- `useVehicleAllowedZone.invalidate()` refreshes `vehicles`, `device-positions`, `device-detail`; map UX depends on those caches staying unchanged
- `selectedDeviceId` from `src/features/map/store/map-store.ts` is the only durable selection anchor for the map flow

## Hidden risks
- Fake-draft reuse means any future geofence draft change can silently break allowed-zone preview semantics
- `MapGeofenceDraftLayer` auto-pans on every draft change; that is undesirable churn for allowed-zone radius edits
- Map CTA is keyed off selected device, but save API needs `vehicleId`; devices without `vehicleId` already short-circuit in overlay
- Preview source `vehicle_position` depends on backend preview query timing; avoid adding frontend assumptions about stale/telemetry semantics
- Sheet reset logic is guarded by `formState.isDirty`; aggressive prop churn from map preview can create confusing resets if ownership boundaries blur
- `showGeofences` toggles only generic geofence visibility; dedicated allowed-zone preview should not depend on that toggle unless product explicitly wants it

## Recommended minimal shape
- Keep `AllowedZoneSetupSheet` shared and unchanged except maybe naming of preview types if needed
- Add a map-only allowed-zone overlay component for circle + center marker + click handler
- Keep map-only orchestration in `tracking-map.tsx` or extract to a small `use-map-allowed-zone-session` hook if file pressure grows
- Do not push allowed-zone session state into `map-store.ts` unless another map surface needs cross-component persistence

## Validation focus
- Open from selected-device overlay
- Preview radius/center updates on map without opening geofence workspace
- Map-pick click only active when sheet arms it
- Non-map callers (`device-detail`, `vehicle-detail`, `geofences page`) still use sheet without map props

## Unresolved questions
- Should allowed-zone preview remain visible when generic geofence layer toggle is off?
- Should map auto-pan when allowed-zone center changes, or stay passive except explicit pick?
