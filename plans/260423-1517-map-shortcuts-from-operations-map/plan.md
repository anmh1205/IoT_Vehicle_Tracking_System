# Plan: Shortcut Detail Navigation From Operations Map

## Goal

Add compact, reliable shortcuts in `vận hành / bản đồ` so an operator can jump from the selected-device overlay to the matching detail context without guessing filters or reopening navigation manually.

## Current Findings

### What the map already has

- `MapSelectedDeviceOverlay` already receives:
  - `device.deviceId`
  - `device.deviceName`
  - `device.vehicleId`
  - `device.vehiclePlate`
  - `device.deviceAlerts`
  - `device.ecuAlerts`
- This is enough to decide target context for shortcuts.

### What blocks direct linking today

- Map data carries **business IDs**:
  - `deviceId` like device code
  - `vehicleId` like vehicle code
- Detail routes currently expect **numeric DB ids**:
  - `src/app/dashboard/devices/[id]/page.tsx`
  - `src/app/dashboard/vehicles/[id]/page.tsx`
- Directly pushing `/dashboard/devices/${device.deviceId}` or `/dashboard/vehicles/${device.vehicleId}` is unsafe today.

### Existing APIs/filters we can reuse

- Device list search already matches `device_id` and `device_name`.
- Vehicle list search already matches `vehicle_id`, `plate_number`, `brand`.
- Alerts backend already supports `deviceId` and `vehicleId` query filters.
- Maintenance backend already supports `vehicleId` query filter.
- Violations backend already supports `vehicleId` query filter.

### Gaps on target pages

- Alerts page does not hydrate filter state from URL query yet.
- Maintenance page has local `vehicleId` filter state, but does not hydrate it from URL query yet.
- Violations page currently has type filter only; no server `vehicleId` filter state in UI yet.
- Device detail page already has a usable `Lỗi gần đây` section, but no anchor target for direct jump.

## Scope

### In scope for v1

- Add a compact shortcut strip inside `MapSelectedDeviceOverlay`.
- Support these primary shortcuts:
  - `Thiết bị`
  - `Xe`
  - `Cảnh báo`
  - `Lỗi gần đây`
- Keep the UI compact on mobile and desktop.
- Resolve business IDs to detail-route numeric IDs safely.
- Support deep-link query hydration on destination pages where needed.

### Explicitly out of scope for v1

- New backend endpoints just for map shortcuts.
- New standalone “fault center” page.
- Shortcut explosion with too many buttons in the overlay.

## UX Direction

- Use one compact shortcut row, not a full action panel.
- Mobile:
  - horizontal scroll or wrap with small pill buttons
  - no large cards, no secondary descriptions
- Desktop:
  - same visual language as current overlay controls
  - keep visual weight below metrics and state chips
- Labels must be explicit and short:
  - `Thiết bị`
  - `Xe`
  - `Cảnh báo`
  - `Lỗi gần đây`

## Proposed Navigation Contract

### 1. `Thiết bị`

- Resolve map `device.deviceId` to numeric device row id via `deviceServices.getList({ search, limit })`.
- Exact-match on returned `deviceId`.
- Navigate to `/dashboard/devices/[numeric-id]`.

### 2. `Xe`

- Resolve map `device.vehicleId` to numeric vehicle row id via `vehicleServices.getList({ search, limit })`.
- Exact-match on returned `vehicleId`.
- Navigate to `/dashboard/vehicles/[numeric-id]`.

### 3. `Cảnh báo`

- Navigate to `/dashboard/alerts` with query params:
  - `deviceId`
  - `vehicleId`
  - `status=active`
- Alerts page hydrates from URL, loads filtered list immediately, and keeps filters visible in page state.

### 4. `Lỗi gần đây`

- Resolve device detail target exactly like shortcut `Thiết bị`.
- Navigate to `/dashboard/devices/[numeric-id]#recent-errors`.
- Add anchor id on the `Lỗi gần đây` section so the jump is deterministic.

## Implementation Plan

### Phase 1. Resolution Layer

- Create a small frontend resolver for map shortcuts, for example:
  - `use-map-shortcut-targets`
  - or `resolve-map-shortcut-targets`
- Responsibilities:
  - resolve `deviceId -> numeric device id`
  - resolve `vehicleId -> numeric vehicle id`
  - exact-match business id from search results
  - expose loading / unavailable states
- Keep it frontend-only first. No backend change unless lookup quality proves insufficient.

### Phase 2. Overlay Shortcut UI

- Update `map-selected-device-overlay.tsx`.
- Add a compact shortcut strip near the overlay summary/actions.
- Disable shortcut buttons while their target is unresolved.
- Hide `Xe` when no `vehicleId`.
- Hide `Lỗi gần đây` when no device target can be resolved.

### Phase 3. Destination Hydration

- Alerts page:
  - read `deviceId`, `vehicleId`, `status`, optional `severity/source` from search params
  - initialize local filter state from URL
- Device detail page:
  - add stable `id="recent-errors"` anchor on the recent errors card
- Keep maintenance/violations out of v1 unless user asks to expose those shortcuts too.

### Phase 4. Verification

- Local:
  - `npm run lint`
  - `npm run build`
- Browser:
  - selected device with both device + vehicle mapping present
  - selected device missing vehicle
  - shortcut jump to alerts preserves active filter
  - shortcut jump to recent errors lands at correct section
  - mobile overlay remains compact
- VPS/manual deploy:
  - build locally
  - transfer image sequentially
  - recreate frontend
  - verify on live domain

## Acceptance Criteria

- From `/dashboard/operations/map`, operator can click shortcut buttons without leaving the wrong entity context.
- `Thiết bị` opens the matching device detail page.
- `Xe` opens the matching vehicle detail page when vehicle exists.
- `Cảnh báo` opens the alerts page already filtered to the current map selection.
- `Lỗi gần đây` lands on the recent-errors section of the current device.
- No overlay growth that materially harms map visibility on mobile or desktop.

## Risks

### Search-based resolve ambiguity

- Risk:
  - device/vehicle search can return multiple rows.
- Mitigation:
  - exact-match only on `deviceId` / `vehicleId`
  - if no exact match, disable target and avoid bad navigation

### Query hydration drift

- Risk:
  - URL says one thing, page state shows another.
- Mitigation:
  - one-time initialization from `searchParams`
  - keep internal filter state normalized

### Overlay bloat

- Risk:
  - too many actions reduce map readability again.
- Mitigation:
  - limit v1 to 4 shortcuts only
  - keep icon+label pills compact

## Recommended Execution Order

1. Build resolver for device/vehicle numeric ids.
2. Add shortcut strip to selected-device overlay.
3. Add alerts URL hydration.
4. Add device detail anchor for recent errors.
5. Run lint/build.
6. Verify with browser locally.
7. Deploy to VPS and verify again.

## Notes For Implementation

- Existing local overlay compaction change should be kept and integrated, not reverted.
- Do not touch unrelated screenshots under `resources/docs/ui-audits/`.
