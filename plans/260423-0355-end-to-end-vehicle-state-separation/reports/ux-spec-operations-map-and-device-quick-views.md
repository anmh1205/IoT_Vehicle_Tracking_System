# UX Spec - Operations Map And Device Quick Views

## Scope

This spec defines the operator-facing UX for the separated state model on:

- `Tracking_Frontend/src/features/map/components/map-device-summary.tsx`
- `Tracking_Frontend/src/features/map/components/map-selected-device-overlay.tsx`
- `Tracking_Frontend/src/features/map/components/selected-device-card.tsx`
- `Tracking_Frontend/src/features/devices/components/device-card.tsx`
- mobile quick-view surfaces fed by the same state model

It is a pre-implementation UX contract, not a code patch.

## Product Goal

An operator must understand the situation in under two seconds:

1. Is the engine on or off?
2. Is the vehicle moving or stationary?
3. Is the device healthy, sleeping, alarming, or failing?
4. Are there active device alerts?
5. Are there active ECU/OBD faults?

The UI must answer those five questions without making the operator read raw telemetry first.

## Current UX Gaps

- `running/stopped` is overloaded and visually dominates the UI.
- Selected device quick-view is telemetry-heavy before it is state-clear.
- Fleet summary dock is aggregate-only and does not prepare the eye for the new state model.
- Alerts are mixed into generic warning affordances instead of being separated by source.
- `use-device-status-realtime.ts` still infers too much from timing instead of server truth.

## Visual Direction

### Direction name

`Operational Frosted Rail`

### Intent

Keep the existing enterprise dashboard visual language, but make map and quick-view surfaces feel more purposeful:

- soft frosted panels
- thin borders
- gentle gradient wash
- compact, high-signal badges
- no noisy card grids inside map overlays

This is not a theme reset. It is a refinement of the current style.

### Why this direction fits the repo

- Existing map overlay already uses blurred, layered surfaces.
- Existing device and map components already rely on `Badge`, `Card`, muted surfaces, and border hierarchy.
- A more editorial or tactical redesign would fight the rest of the dashboard.

## Core Interaction Model

### Primary quick-view hierarchy

Every quick-view surface must render information in this order:

1. Identity
2. Freshness
3. State triad
4. Alert summary
5. Secondary telemetry
6. Actions

### State triad

The UI must always show three independent state chips:

- `Động cơ`
- `Di chuyển`
- `Thiết bị`

Do not collapse these three into one badge.

### Alert grouping

Always show two alert families separately:

- `Thiết bị`
- `ECU`

Quick views show counts and highest severity only.
Expanded views show itemized content.

## Canonical Frontend State View Model

All quick-view components should consume a normalized presentation model, not raw legacy fields:

```ts
type StateTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';

interface QuickStateChip {
  label: string;
  value: string;
  tone: StateTone;
  icon: string;
}

interface QuickAlertGroup {
  source: 'device' | 'ecu';
  count: number;
  highestSeverity: 'none' | 'info' | 'warn' | 'critical';
  summary: string;
}

interface DeviceQuickStateViewModel {
  freshnessLabel: string;
  freshnessTone: StateTone;
  engine: QuickStateChip;
  motion: QuickStateChip;
  device: QuickStateChip;
  deviceAlerts: QuickAlertGroup;
  ecuAlerts: QuickAlertGroup;
  telemetry: {
    speedKph: string;
    rpm: string;
    deviceBattery: string;
    vehicleBattery: string;
    engineTemp: string;
    coordinates: string;
  };
}
```

### Important rule

`use-device-status-realtime.ts` must become a fallback adapter only.
The preferred source of truth is backend-provided normalized state.

## State Chip Spec

### Engine chip

| State | Label | Tone | Icon |
|---|---|---|---|
| `ON` | `Động cơ: Bật` | `warn` | power / engine |
| `OFF` | `Động cơ: Tắt` | `neutral` | power-off |
| `UNKNOWN` | `Động cơ: Chưa rõ` | `info` | help-circle |

Reasoning:
- Use warm amber for engine-on, not green.
- Engine-on is not always a positive success event; it is an operating condition.

### Motion chip

| State | Label | Tone | Icon |
|---|---|---|---|
| `MOVING` | `Di chuyển: Đang chạy` | `success` | route / arrow-up-right |
| `STATIONARY` | `Di chuyển: Đứng yên` | `neutral` | pause / map-pin |
| `UNKNOWN` | `Di chuyển: Chưa rõ` | `info` | orbit / radar |

### Device chip

| State | Label | Tone | Icon |
|---|---|---|---|
| `ACTIVE` | `Thiết bị: Hoạt động` | `success` | cpu |
| `SLEEP_PREPARE` | `Thiết bị: Chuẩn bị ngủ` | `warn` | moon-star |
| `SLEEPING` | `Thiết bị: Đang ngủ` | `neutral` | moon |
| `WAKING` | `Thiết bị: Đang thức dậy` | `info` | zap |
| `ALARM` | `Thiết bị: Báo động` | `danger` | siren / alert-triangle |
| `OTA` | `Thiết bị: Cập nhật` | `info` | refresh-cw |
| `FAULT` | `Thiết bị: Lỗi` | `danger` | triangle-alert |
| `BOOTING` | `Thiết bị: Khởi động` | `info` | loader |

## Freshness Spec

Freshness is separate from device state.

### Freshness levels

| Condition | Label | Tone |
|---|---|---|
| recent and connected | `Vừa cập nhật` | `success` |
| recent but delayed | `Cập nhật trễ` | `warn` |
| stale | `Dữ liệu cũ` | `warn` |
| disconnected | `Mất kết nối` | `danger` |
| no telemetry | `Chưa có dữ liệu` | `neutral` |

### Placement

- Always show freshness near identity, before telemetry.
- Use small dot + text, not a giant badge.

## Surface Spec

## 1. Fleet Bottom Dock

### Component

- `map-device-summary.tsx`

### Role

Fleet-level overview shown when no device is selected.

### Replace current aggregate grid with

- left cluster:
  - title `Toàn đội xe`
  - freshness summary `Cập nhật realtime`
- center chip row:
  - `Động cơ bật`
  - `Đang di chuyển`
  - `Đứng yên`
  - `Thiết bị lỗi`
- right compact metrics:
  - visible / total
  - hidden count

### Visual treatment

- One horizontal dock, not a 2x2 stat card grid.
- Chips should read like operational counters, not dashboard KPIs.

### Behavior

- When a device is selected, this dock yields to the selected-device dock.

## 2. Selected Device Bottom Dock

### Component

- `map-selected-device-overlay.tsx`

### Role

Primary quick-view surface for map operations.

### Layout anatomy

#### Row 1: Identity rail

- vehicle plate
- device name
- customer/owner if present
- freshness text
- close action

#### Row 2: State triad

- engine chip
- motion chip
- device chip

#### Row 3: Alert summary rail

- `Thiết bị` alert pill with count and highest severity
- `ECU` alert pill with count and highest severity
- allowed-zone state pill if configured

#### Row 4: Compact telemetry strip

- speed
- rpm
- device battery
- vehicle battery
- engine temperature
- relative update time

#### Row 5: Actions

- `Hiện vùng` / `Ẩn vùng`
- `Chỉnh vùng`
- `Chi tiết`

### Critical design rules

- State triad must be the visual focal point, not telemetry metrics.
- Coordinates do not belong in the primary strip on mobile.
- Raw alert titles do not belong in the primary strip.
- Long alert lists move into a secondary expandable sheet/tooltip.

### Desktop sizing

- Max width around `920px`
- Height should stay visually shallow enough to not hide the map

### Mobile sizing

- Single-column stacked blocks
- Actions become 2-column or 3-button compact row
- Telemetry strip becomes horizontally scrollable chips if needed

## 3. Sidebar / Detail Summary Card

### Component

- `selected-device-card.tsx`

### Role

Secondary explainer card for the selected map device.

### Content

- keep state triad on top
- show telemetry grid below
- show two separate sections:
  - `Cảnh báo thiết bị`
  - `Cảnh báo ECU`
- show DTC expand section only here or deeper

### Difference from bottom dock

- Bottom dock = act fast
- Sidebar/detail card = understand why

## 4. Device Quick Card

### Component

- `device-card.tsx`

### Replace current top badge logic

Current `currentStatus` badge is too coarse.

### New header hierarchy

- title + plate
- freshness micro-label
- state triad row

### Mid-card

- concise telemetry:
  - speed
  - last seen
  - firmware

### Bottom row

- `Thiết bị: n cảnh báo`
- `ECU: n lỗi`

### Rule

Do not render four independent operational truths as one top-right badge.

## Alert Presentation Rules

### Device alerts

Examples:

- mất LTE
- mất MQTT
- pin yếu
- GNSS stale
- watchdog/reset
- sleep blocked

Quick-view rendering:

- source label
- count
- highest severity
- optional one-line dominant summary

### ECU alerts

Examples:

- MIL on
- DTC stored
- DTC pending
- cảm biến nhiệt lỗi
- tín hiệu rpm bất thường

Quick-view rendering:

- source label
- count
- optional `MIL`
- no raw DTC code wall in quick-view

Expanded rendering:

- grouped by severity or type
- include DTC chips and descriptions

## Responsive Behavior

### Desktop

- bottom dock spans width with shallow height
- sidebar/detail can show richer diagnostic blocks

### Tablet

- compress telemetry strip first
- keep state triad intact

### Mobile

- preserve chip order
- collapse telemetry into two compact rows
- alerts summarized into two pills
- details open in sheet, not tooltip

## Accessibility And Motion

- all chips and alert pills must keep contrast >= 4.5:1
- icon-only actions must keep `aria-label`
- focus order must follow visual order
- hover extras must have click/tap alternative
- transitions should stay within `150-220ms`
- no motion dependency for understanding state

## Implementation Mapping

### Frontend types to replace or extend

- `src/features/map/types/index.ts`
- `src/features/devices/types/index.ts`
- `src/hooks/use-device-status-realtime.ts`

### Frontend rendering surfaces to update

- `src/features/map/components/map-device-summary.tsx`
- `src/features/map/components/map-selected-device-overlay.tsx`
- `src/features/map/components/selected-device-card.tsx`
- `src/features/devices/components/device-card.tsx`
- `src/features/devices/components/device-detail-sheet.tsx`
- `src/features/devices/components/device-detail-modal.tsx`

## Acceptance Criteria

- An operator can distinguish `máy bật nhưng xe đứng yên` from `xe đang chạy` without opening detail.
- Device health and ECU health are visually distinct.
- The map bottom dock remains readable and compact on `375px`, `768px`, `1024px`, and `1440px`.
- No quick-view surface relies on `running/stopped` wording as the primary user-facing truth.
- The visual language feels like one coherent system across map and devices pages.
