# Phase 07 - Frontend Implementation Surfaces

## Objective

Implement the approved state model across the dashboard with reusable primitives and minimal duplicated logic.

## Reference Spec

- `reports/ux-spec-operations-map-and-device-quick-views.md`

## Shared Frontend Modules

- Add shared state badge helpers and formatters under feature/shared UI modules.
- Replace heuristic-only hooks such as `use-device-status-realtime.ts` with canonical model support and legacy fallback mapping.

## Operations Map

### Required surfaces

- `tracking-map.tsx`
- `map-device-summary.tsx`
- `map-selected-device-overlay.tsx`
- `device-list-panel.tsx`
- `device-list-item.tsx`
- `selected-device-card.tsx`

### Requirements

- Quick-view must show:
  - engine chip
  - motion chip
  - device chip
  - latest alert counts
- When space is tight, collapse alert text into counts, not raw sentences.
- Bottom map bar should prioritize operator actionability over full diagnostic detail.

## Devices Module

### Required surfaces

- `device-card.tsx`
- `device-detail-sheet.tsx`
- `device-detail-modal.tsx`
- `device-telemetry-tab.tsx`
- `device-session-table.tsx`

### Requirements

- Device list cards show compact state summary and alert counts.
- Device detail shows explicit sections:
  - Vehicle state
  - Device runtime
  - Device alerts
  - ECU alerts
  - DTC detail
- Session tables must stop relying on `running/stopped` labels alone.

## API Client And Types

- Add typed frontend models for normalized states.
- Prefer server truth over local timing heuristics.
- Keep fallback adapter for partially migrated environments.

## Exit Criteria

- Operations map supports fast reading for dispatch/operator workflows
- Device detail supports diagnostic depth without crowding the quick-view surfaces
- Shared presentation primitives prevent drift between pages
