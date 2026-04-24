# Phase 2: Surface Budget And Mode Matrix

## Goal
Define hard rules for what may be visible, interactive, and stateful at the same time on `dashboard/operations/map`.

This phase is the UX contract that prevents future map UI sprawl.

## Decision model

Use `hard mode + soft modifier`.

### Hard mode
A hard mode owns the main workspace and decides which major surface gets screen space.

### Soft modifier
A soft modifier changes behavior or visibility of a lightweight layer, but must not create another major surface.

## Default V1 decisions

1. Desktop edit mode hides the left browse panel in v1.
2. Desktop inspect mode keeps the selected-device surface as a bottom briefing card in v1.
3. Geofence edit and allowed-zone edit are mutually exclusive.
4. Allowed-zone visibility follows the selected vehicle. Switching vehicle switches visible zone context.
5. Dirty edit state requires discard confirmation before switching vehicle or leaving edit mode.

## Surface taxonomy

### Major surfaces

1. Left browse panel
   - current implementation: `device-list-panel.tsx`
2. Right geofence workspace
   - current implementation: `map-geofence-workspace.tsx`
3. Right allowed-zone panel
   - current implementation: `map-allowed-zone-panel.tsx`
4. Mobile list sheet
   - current implementation: `mobile-device-drawer.tsx`
5. Mobile edit sheet/card
   - geofence or allowed-zone edit surface

### Contextual surfaces

1. Selected-device briefing card
   - current implementation: `map-selected-device-overlay.tsx`
2. Map error banner
   - current implementation: top alert in `src/app/dashboard/map/page.tsx`
3. Floating map controls
   - current implementation: `map-controls.tsx`

### Non-surface state

1. selected device id
2. follow state
3. geofence layer visibility
4. allowed-zone visibility
5. map viewport
6. map layer

## Hard modes

1. `browse`
2. `inspect-device`
3. `edit-geofence`
4. `edit-allowed-zone`
5. `mobile-list`

## Soft modifiers

1. `follow-selected-device`
2. `show-geofence-layer`
3. `show-allowed-zone-layer`
4. `map-error-banner`

## Desktop mode matrix

| Hard mode | Entry trigger | Major surface | Contextual surface | Visible modifiers | Hidden or suppressed surfaces | Primary operator intent |
|---|---|---|---|---|---|---|
| `browse` | open map, clear selection, close inspect/edit | left browse panel | none | geofence layer toggle, map error banner, map controls | selected-device briefing card, geofence workspace, allowed-zone panel | search, filter, scan fleet, pan/zoom |
| `inspect-device` | select a device from list or marker | left browse panel | bottom selected-device briefing card | follow, geofence layer toggle, allowed-zone layer toggle, map error banner, map controls | geofence workspace, allowed-zone panel | inspect one device quickly, jump to detail, follow, show zone |
| `edit-geofence` | open geofence workspace, create geofence, edit geofence | right geofence workspace | none | geofence layer forced on, map error banner, minimal map controls | left browse panel, selected-device briefing card, allowed-zone panel | create, edit, delete, save geofence |
| `edit-allowed-zone` | create/edit allowed zone from selected device | right allowed-zone panel | none | allowed-zone preview/layer, map error banner, minimal map controls | left browse panel, selected-device briefing card, geofence workspace | edit one vehicle's allowed zone |

## Mobile mode matrix

| Hard mode | Major surface | Contextual surface | Visible modifiers | Hidden or suppressed surfaces | Primary operator intent |
|---|---|---|---|---|---|
| `browse` | none, map-first canvas | none | list trigger, map controls, map error banner, geofence layer toggle | inspect card, mobile list sheet, edit sheet | scan and navigate |
| `inspect-device` | bottom selected-device briefing card | none | follow, geofence layer toggle, allowed-zone layer toggle, map error banner, map controls | mobile list sheet, edit sheet | inspect selected device quickly |
| `mobile-list` | bottom list sheet | none | map error banner only | inspect card, edit sheet | choose a device quickly |
| `edit-geofence` | bottom geofence edit sheet | none | geofence layer forced on, map error banner, minimal controls | inspect card, mobile list sheet, allowed-zone edit | geofence authoring |
| `edit-allowed-zone` | bottom allowed-zone edit sheet | none | allowed-zone preview/layer, map error banner, minimal controls | inspect card, mobile list sheet, geofence edit | allowed-zone authoring |

## Mode transition rules

### Shared rules

1. Switching to any edit mode suppresses all browsing-only contextual surfaces.
2. Only one hard mode may be active at a time.
3. A soft modifier may not open a new major surface.
4. `selectedDeviceId = null` forces:
   - selected-device briefing card hidden
   - `follow-selected-device = false`
   - `show-allowed-zone-layer = false`

### Desktop and mobile transitions

1. `browse -> inspect-device`
   - triggered by selecting a device
   - selected-device briefing card appears
   - allowed-zone layer, if active, rebinds to the newly selected vehicle

2. `inspect-device -> inspect-device`
   - triggered by selecting another device
   - device context swaps immediately
   - follow modifier transfers to the new selected device
   - allowed-zone layer transfers to the new selected vehicle
   - previous vehicle allowed zone is hidden

3. `inspect-device -> edit-geofence`
   - selected-device briefing card closes
   - geofence workspace opens
   - geofence layer becomes forced-on
   - allowed-zone panel must be closed

4. `inspect-device -> edit-allowed-zone`
   - selected-device briefing card closes
   - allowed-zone panel opens
   - geofence workspace must be closed
   - selected vehicle context is locked to the active panel until save, cancel, or discard

5. `edit-geofence -> inspect-device` or `browse`
   - save or cancel returns to prior browsing state
   - if selected device still exists, return to `inspect-device`
   - otherwise return to `browse`

6. `edit-allowed-zone -> inspect-device` or `browse`
   - same return logic as geofence edit

7. `mobile-list -> inspect-device`
   - selecting a device closes the list sheet immediately
   - selected-device briefing card opens

8. `edit-* -> other selected device`
   - if form is clean, switch is allowed
   - if form is dirty, show discard confirmation before switching

## Suppression rules

1. `edit-geofence` and `edit-allowed-zone` are mutually exclusive.
2. On desktop, opening either edit mode hides the left browse panel in v1.
3. On desktop, the selected-device briefing card is only allowed in `inspect-device`.
4. On mobile, only one major sheet or card may own focus at a time.
5. Opening `mobile-list` hides the inspect card.
6. Opening any edit sheet hides both `mobile-list` and inspect card.
7. Allowed-zone visibility is bound to `selectedVehicleId`, not to the previously viewed vehicle.
8. Geofence layer may remain user-toggled in browse and inspect, but is forced-on in geofence edit.

## Surface budget: desktop

### Budget rules

1. Maximum simultaneous footprint:
   - one major panel
   - one contextual surface
   - floating controls
2. Never allow:
   - left browse panel + right edit panel + bottom briefing card at full size
3. Map error banner is exempt from major-surface counting, but must stay compact.

### Recommended dimensions

1. Left browse panel
   - target width: `320px - 340px`
   - hard max: `26vw`

2. Right edit panel
   - target width: `400px - 420px`
   - hard max: `30vw`

3. Bottom selected-device briefing card
   - target width: `720px - 760px`
   - target max height: `18rem`
   - hard max height: `30dvh`

4. Top error banner
   - target height: `<= 72px` of visible content where possible

5. Floating control clusters
   - top cluster: no more than 3 high-priority action buttons plus layer switch
   - bottom cluster: no more than 3 navigation buttons

### Visible map minimums

1. `browse`
   - visible map width: at least `74%`
2. `inspect-device`
   - visible map width: at least `74%`
   - visible map height: at least `64%`
3. `edit-geofence`
   - visible map width: at least `68%`
4. `edit-allowed-zone`
   - visible map width: at least `68%`

## Surface budget: mobile

### Budget rules

1. Only one major sheet or card may be active at a time.
2. The map must always remain partially visible behind the active sheet or card.
3. Floating controls must not overlap the list trigger or the active sheet handle.

### Recommended dimensions

1. Selected-device briefing card
   - target height: `24dvh - 30dvh`
   - hard max: `16rem`

2. Mobile list sheet
   - target height: `68dvh - 76dvh`

3. Mobile edit sheet
   - default target height: `68dvh - 72dvh`
   - temporary max when needed: `80dvh`

### Visible map minimums

1. `browse`
   - map remains effectively full-height behind lightweight controls
2. `inspect-device`
   - visible map height: at least `55%`
3. `edit-geofence`
   - visible map height: at least `28%`
4. `edit-allowed-zone`
   - visible map height: at least `28%`

## Modifier rules

### `follow-selected-device`

1. Valid only in `inspect-device`.
2. Disabled automatically when no selected device exists.
3. Transfers to the next selected device when the operator changes selection.
4. Not active in edit modes.

### `show-geofence-layer`

1. Valid in `browse` and `inspect-device`.
2. Forced-on in `edit-geofence`.
3. Exiting `edit-geofence` returns it to the pre-edit user state unless product later decides otherwise.

### `show-allowed-zone-layer`

1. Valid only when a selected vehicle exists.
2. Valid in `inspect-device`.
3. When selected vehicle changes, visible zone changes to the new selected vehicle immediately.
4. Clearing selection hides the layer.

### `map-error-banner`

1. May appear in any hard mode.
2. Must not replace the current major surface.
3. Must remain dismissible or recoverable by retry.

## Implementation checklist for phase 2

1. Encode hard-mode ownership in map route state orchestration.
2. Encode suppression rules in component mount logic.
3. Reduce edit-mode coexistence to one edit panel only.
4. Ensure allowed-zone visibility always rebinds to selected vehicle.
5. Add dirty-edit discard rule before selection changes or edit exits.
6. Constrain desktop edit mode to hide left browse panel in v1.
7. Constrain selected-device card to inspect mode only.
8. Constrain mobile to one major sheet/card at a time.

## Outputs

1. Approved hard-mode list
2. Approved modifier list
3. Desktop mode matrix
4. Mobile mode matrix
5. Suppression rule set
6. Desktop surface budget
7. Mobile surface budget
8. Implementation checklist

## Acceptance

1. No mode leaves ownership ambiguous.
2. No two major edit surfaces are allowed simultaneously.
3. Vehicle switching cannot leave the old vehicle allowed-zone layer visible.
4. The selected-device surface cannot coexist with edit surfaces.
5. Desktop and mobile both obey a one-major-surface rule.
