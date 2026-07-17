# Phase 06 - Frontend UX Architecture

## Objective

Define a compact, attractive, and operationally fast UI model for the separated state system before coding components.

## Reference Spec

- `reports/ux-spec-operations-map-and-device-quick-views.md`

## UX Principles

- Show three primary truths first:
  - Engine
  - Motion
  - Device
- Separate health/warning information from state.
- Keep quick-view readable in under two seconds.
- Expand progressively for detail; do not flood the map UI.

## Visual System

### Primary state chips

- `Engine`: `Bật`, `Tắt`, `Không rõ`
- `Di chuyển`: `Đang chạy`, `Đứng yên`, `Không rõ`
- `Thiết bị`: `Hoạt động`, `Ngủ`, `Đánh thức`, `Báo động`, `OTA`, `Lỗi`

### Color language

- Engine `ON`: warm amber/green
- Motion `MOVING`: teal/blue
- Motion `STATIONARY`: neutral slate
- Device `FAULT` / alerts: orange/red
- Avoid purple-heavy default palette

### Alert grouping

- Device alerts block
- ECU alerts block
- DTC summary line with expand action, not full code spam in quick-view

## Quick-View Surfaces

### Operations map

- Bottom summary bar in `map-device-summary.tsx`
- Selected device overlay in `map-selected-device-overlay.tsx`
- Device list item in `device-list-item.tsx`
- Mobile drawer in `mobile-device-drawer.tsx`

### Devices module

- `device-card.tsx`
- `device-detail-sheet.tsx`
- `device-detail-modal.tsx`
- `device-stats-bar.tsx`

## Information Hierarchy

### Quick view

- Vehicle name / plate
- freshness dot + last seen
- three compact state chips
- one-line alert summary:
  - `Thiết bị: 1 cảnh báo`
  - `ECU: 2 lỗi`

### Expanded detail

- state explanation row
- device alerts panel
- ECU alerts and DTC panel
- telemetry freshness and sensor quality panel

## Exit Criteria

- UX spec is compact enough for map quick scan
- Same mental model is reused across list, map, sheet, and detail views
- No surface uses raw `running/stopped` wording unless explicitly labeled as legacy
