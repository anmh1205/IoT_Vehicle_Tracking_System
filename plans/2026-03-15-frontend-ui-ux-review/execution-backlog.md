# Frontend UI/UX Execution Backlog

## How to use
- This backlog operationalizes `plan.md` into implementation workstreams.
- Coverage guardrails:
  - `reports/file-implementation-checklist.md`
  - `reports/feature-coverage-summary.md`
  - `reports/file-by-file-ui-ux-audit.md`
- A backlog item is only done when:
  - all directly listed files are updated or explicitly verified
  - related checklist rows in the covered domains are closed
  - mobile behavior is checked for the affected surfaces
  - loading, empty, error, and permission states are re-reviewed

## Wave 0: Trust And Integrity

### BL-001
- Priority: `P0`
- Title: Fix broken Vietnamese copy across all user-facing surfaces
- Scope:
  - `src/app/root`
  - `src/app/dashboard`
  - `src/features/dashboard`
  - `src/features/devices`
  - `src/features/map`
  - `src/features/notifications`
  - `src/features/system-admin`
  - `src/features/system-status`
  - `src/features/marketing`
- Key files:
  - `src/app/dashboard/page.tsx`
  - `src/app/dashboard/map/page.tsx`
  - `src/app/dashboard/system-status/page.tsx`
  - `src/app/dashboard/system-admin/page.tsx`
  - `src/app/global-error.tsx`
  - `src/features/dashboard/components/*`
  - `src/features/map/components/*`
  - `src/features/marketing/components/*`
- Done when:
  - no mojibake remains on any user-facing route or shared component
  - common labels are normalized and reused consistently
  - alert, status, empty, and error copy reads naturally in Vietnamese

### BL-002
- Priority: `P0`
- Title: Remove synthetic monitoring data and replace it with explicit degraded-state UX
- Scope:
  - `src/features/system-status`
  - `src/features/dashboard/hooks/use-dashboard-stats.ts`
  - dependent dashboard/system-status charts and cards
- Key files:
  - `src/features/system-status/hooks/use-system-status.ts`
  - `src/app/dashboard/system-status/page.tsx`
  - `src/features/system-status/components/health-card.tsx`
  - `src/features/system-status/components/metric-card.tsx`
  - `src/features/dashboard/hooks/use-dashboard-stats.ts`
- Done when:
  - generated fallback health metrics are removed or clearly marked unavailable
  - dashboard/system-status surfaces show stale, degraded, or failed states honestly
  - operators cannot mistake inferred values for live infrastructure telemetry

### BL-002A
- Priority: `P0`
- Title: Normalize timezone-safe day handling across dashboard, analytics, and maintenance
- Scope:
  - day-based filters
  - default date windows
  - calendar day matching
  - day-oriented timestamps written from the UI
- Key files:
  - `src/features/dashboard/hooks/use-dashboard-stats.ts`
  - `src/features/fuel-analytics/hooks/use-fuel-analytics.ts`
  - `src/features/statistics/hooks/use-statistics.ts`
  - `src/features/maintenance/components/maintenance-calendar.tsx`
  - `src/app/dashboard/maintenance/page.tsx`
- Done when:
  - local-day defaults no longer depend on raw UTC `toISOString().slice(0, 10)` logic
  - calendar matching stays correct for the user's timezone instead of string-sliced UTC dates
  - day-based analytics and maintenance views share one explicit timezone rule
  - date handling is documented enough that future filters/charts follow the same rule

### BL-003
- Priority: `P0`
- Title: Stabilize viewport contract and scroll ownership across shell-level screens
- Scope:
  - `src/app/root`
  - `src/app/dashboard`
  - `src/components/layout`
  - `src/components/auth`
  - `src/features/map`
- Key files:
  - `src/app/dashboard/layout.tsx`
  - `src/components/layout/PageContainer.tsx`
  - `src/app/dashboard/map/page.tsx`
  - `src/features/map/components/device-list-panel.tsx`
  - `src/features/map/components/mobile-device-drawer.tsx`
  - `src/app/login/page.tsx`
  - `src/app/global-error.tsx`
  - `src/components/auth/session-guard.tsx`
- Done when:
  - one shell contract controls header/banner/content heights
  - nested scroll conflicts are removed on login, dashboard, map, and error states
  - mobile safe-area and offline banner behavior no longer clip content

### BL-004
- Priority: `P0`
- Title: Fix global offline, error, and permission-state UX
- Scope:
  - shell-level system states
  - restricted/admin-only routes
  - empty/error patterns reused across features
- Key files:
  - `src/components/common/connection-banner.tsx`
  - `src/app/error.tsx`
  - `src/app/global-error.tsx`
  - `src/app/not-found.tsx`
  - `src/lib/api/client.ts`
  - `src/components/nav-user.tsx`
  - `src/features/auth/components/login-form.tsx`
  - restricted route branches in `users`, `exports`, `firmware`, `simulator`, `system-admin`, `system-status`
- Done when:
  - connection loss is announced accessibly
  - error/restricted pages feel product-grade, not fallback-grade
  - permission gates and retry actions are consistent across modules
  - session-expiry and logout transitions preserve user context and communicate what happened more clearly

## Wave 1: Shared Mobile Foundation

### BL-005
- Priority: `P1`
- Title: Normalize mobile touch targets and overlay behavior in shared UI primitives
- Scope:
  - `src/components/ui`
- Key files:
  - `src/components/ui/button.tsx`
  - `src/components/ui/tabs.tsx`
  - `src/components/ui/sheet.tsx`
  - `src/components/ui/dialog.tsx`
  - `src/components/ui/select.tsx`
  - `src/components/ui/dropdown-menu.tsx`
- Done when:
  - frequent controls reach mobile-safe target size
  - sheets/dialogs account for safe-area and small-screen overflow
  - shared primitives expose one reusable safe-area-aware pattern for edge-attached mobile surfaces
  - tab lists and select/dropdown controls no longer pinch or micro-size on mobile

### BL-006
- Priority: `P1`
- Title: Rebuild shared data-table UX for responsive dense-data screens
- Scope:
  - `src/components/common`
  - `src/features/system-admin/components/data-table`
- Key files:
  - `src/components/common/data-table.tsx`
  - `src/components/common/data-table-column-header.tsx`
  - `src/features/system-admin/components/data-table/data-table.tsx`
  - `src/features/system-admin/components/data-table/toolbar.tsx`
  - `src/features/system-admin/components/data-table/pagination.tsx`
- Done when:
  - toolbar rows stack/wrap intentionally
  - search controls have explicit labels
  - column chooser uses human-readable labels
  - horizontal overflow and mobile summary modes support real tasks

### BL-007
- Priority: `P1`
- Title: Standardize empty, loading, and error anatomy across reused surfaces
- Scope:
  - `src/components/common`
  - chart/list/detail empty states across features
- Key files:
  - `src/components/common/empty-state.tsx`
  - `src/components/common/stat-card.tsx`
  - `src/features/devices/components/device-detail-modal/empty-state.tsx`
  - `src/features/notifications/components/notification-list.tsx`
  - `src/features/fuel-analytics/components/*`
  - `src/features/statistics/components/*`
- Done when:
  - all major list/chart/detail surfaces use one coherent empty/loading/error language
  - empty states offer next actions where the workflow depends on them
  - cards/charts do not collapse awkwardly on mobile

### BL-008
- Priority: `P1`
- Title: Replace placeholder-led forms with labeled, validated, mobile-safe form patterns
- Scope:
  - CRUD dialogs
  - settings/profile/password
  - system-admin query inputs
  - export/firmware/trip/vehicle/customer forms
- Key files:
  - `src/features/auth/components/login-form.tsx`
  - `src/app/dashboard/customers/page.tsx`
  - `src/app/dashboard/users/page.tsx`
  - `src/app/dashboard/firmware/page.tsx`
  - `src/features/trips/components/trip-form.tsx`
  - `src/features/vehicles/components/vehicle-form.tsx`
  - `src/features/drivers/components/driver-form.tsx`
  - `src/features/settings/components/profile-form.tsx`
  - `src/features/settings/components/password-form.tsx`
  - `src/features/system-admin/components/query-builder.tsx`
- Done when:
  - required fields have visible labels and helper/error messaging
  - form layouts do not rely on placeholder text for meaning
  - common fields expose appropriate `type`, `autoComplete`, and `inputMode` hints for browser/mobile ergonomics
  - dialogs stay usable on narrow/mobile screens
  - submit actions expose pending/disabled/error states consistently enough to prevent duplicate submission ambiguity

## Wave 2: Operator Core Flows

### BL-009
- Priority: `P1`
- Title: Turn notifications into a real triage workflow
- Scope:
  - `src/app/dashboard/notifications/page.tsx`
  - `src/features/notifications`
- Key files:
  - `src/features/notifications/components/notification-center.tsx`
  - `src/features/notifications/components/notification-dropdown.tsx`
  - `src/features/notifications/components/notification-list.tsx`
  - `src/features/notifications/components/notification-filters.tsx`
  - `src/features/notifications/components/notification-item.tsx`
  - `src/features/notifications/hooks/use-notifications.ts`
- Done when:
  - dropdown supports glance-only behavior
  - page-level center supports real filtering, grouping, and refresh/triage flows
  - read/unread, routing targets, empty/loading states, and mobile layout are coherent

### BL-010
- Priority: `P1`
- Title: Complete map desktop/mobile parity and operator loop
- Scope:
  - map page
  - list/filter/search/selected-device overlays
- Key files:
  - `src/app/dashboard/map/page.tsx`
  - `src/features/map/components/device-list-panel.tsx`
  - `src/features/map/components/mobile-device-drawer.tsx`
  - `src/features/map/components/device-search.tsx`
  - `src/features/map/components/device-filter.tsx`
  - `src/features/map/components/device-filter-compact.tsx`
  - `src/features/map/components/tracking-map.tsx`
  - `src/features/map/components/map-sidebar.tsx`
- Done when:
  - desktop and mobile show equivalent empty, selection, and filter states
  - there is one clear scroll owner per mode
  - selected-device context stays visible enough to support operator actions

### BL-011
- Priority: `P1`
- Title: Complete device workflows across list, modal, and detail page
- Scope:
  - devices page
  - detail modal and detail route
- Key files:
  - `src/app/dashboard/devices/page.tsx`
  - `src/app/dashboard/devices/[id]/page.tsx`
  - `src/features/devices/components/device-filters.tsx`
  - `src/features/devices/components/device-detail-modal/index.tsx`
  - `src/features/devices/components/device-detail-modal/sessions-tab.tsx`
  - `src/features/devices/components/device-detail-modal/error-codes-tab.tsx`
  - `src/features/devices/components/device-detail-modal/settings-tab.tsx`
  - `src/features/devices/components/device-detail-modal/runtime-tab.tsx`
  - `src/features/devices/components/device-detail-modal/vibration-tab.tsx`
- Done when:
  - mobile device flow no longer depends on desktop table assumptions
  - detail modal tabs feel complete, not just inspect-only or placeholder
  - device detail page and modal share a consistent action model and visual grammar
  - refresh, export, and command affordances map to real actions instead of partial or misleading UI wiring

### BL-012
- Priority: `P1`
- Title: Complete alerts and violations triage flows
- Scope:
  - alerts page
  - violations page
- Key files:
  - `src/app/dashboard/alerts/page.tsx`
  - `src/features/alerts/components/alert-filters.tsx`
  - `src/features/alerts/components/alert-columns.tsx`
  - `src/features/alerts/components/alert-detail-modal.tsx`
  - `src/app/dashboard/violations/page.tsx`
- Done when:
  - filter controls are visible, scalable, and mobile-safe
  - bulk actions and individual resolution flows are clear
  - violations support explicit filtering and acknowledgement workflow, not just a passive table

### BL-013
- Priority: `P1`
- Title: Complete trips workflows and replay UX
- Scope:
  - trips list
  - trip form
  - trip detail/replay
- Key files:
  - `src/app/dashboard/trips/page.tsx`
  - `src/features/trips/components/trip-form.tsx`
  - `src/features/trips/components/trip-columns.tsx`
  - `src/app/dashboard/trips/[id]/page.tsx`
  - `src/features/trips/components/trip-detail.tsx`
  - `src/features/trips/components/trip-replay-controls.tsx`
- Done when:
  - trip creation/editing feels like a real operational form
  - replay controls, interval controls, and charts/maps are mobile-safe
  - trip detail provides a stronger status, summary, and action structure

### BL-014
- Priority: `P1`
- Title: Rework dashboard overview into a real command-center entry point
- Scope:
  - dashboard route
  - dashboard widgets/cards/feeds/charts
- Key files:
  - `src/app/dashboard/page.tsx`
  - `src/features/dashboard/components/overview-stats.tsx`
  - `src/features/dashboard/components/quick-actions.tsx`
  - `src/features/dashboard/components/recent-alerts.tsx`
  - `src/features/dashboard/components/activity-feed.tsx`
  - `src/features/dashboard/components/*chart*.tsx`
- Done when:
  - dashboard cards reflect primary operator jobs
  - secondary widgets are visually aligned with the command-center style
  - fallback-derived charts are reviewed together with BL-002

## Wave 3: Management And Admin Workflows

### BL-015
- Priority: `P1`
- Title: Turn settings into a real account/preferences center
- Scope:
  - settings page
  - profile/password/preferences/theme components
- Key files:
  - `src/app/dashboard/settings/page.tsx`
  - `src/features/settings/components/profile-form.tsx`
  - `src/features/settings/components/password-form.tsx`
  - `src/features/settings/components/notification-prefs.tsx`
  - `src/features/settings/components/theme-selector.tsx`
- Done when:
  - current profile/preferences are loaded from real backend state
  - save flows provide pending/success/error feedback
  - mobile tabs and forms feel intentional, not compressed desktop forms

### BL-016
- Priority: `P1`
- Title: Upgrade users, customers, and drivers CRUD to production-ready forms and lists
- Scope:
  - user/customer/driver list and dialogs
- Key files:
  - `src/app/dashboard/users/page.tsx`
  - `src/app/dashboard/customers/page.tsx`
  - `src/app/dashboard/drivers/page.tsx`
  - `src/features/drivers/components/driver-form.tsx`
  - related columns/dialog helpers
- Done when:
  - forms are labeled and validated
  - list pages scale beyond local 200-row assumptions
  - mobile/tablet management flows are no longer toolbar- or dialog-fragile

### BL-017
- Priority: `P1`
- Title: Complete vehicles feature beyond the current info-only modal
- Scope:
  - vehicles list
  - vehicle detail modal and detail route
  - device assignment flow
- Key files:
  - `src/app/dashboard/vehicles/page.tsx`
  - `src/app/dashboard/vehicles/[id]/page.tsx`
  - `src/features/vehicles/components/vehicle-detail-modal.tsx`
  - `src/features/vehicles/components/vehicle-assign-device.tsx`
  - `src/features/vehicles/components/vehicle-form.tsx`
- Done when:
  - vehicle detail no longer contains placeholder trip content
  - assignment, status, trip history, and related device context are visible and actionable
  - modal and full-page detail surfaces share a coherent anatomy
  - assign-device flow is visibly integrated, state-synced, or intentionally removed

### BL-018
- Priority: `P1`
- Title: Complete geofence creation, assignment, and detail management
- Scope:
  - geofences list/detail
  - geofence form/map editor/binder
- Key files:
  - `src/app/dashboard/geofences/page.tsx`
  - `src/app/dashboard/geofences/[id]/page.tsx`
  - `src/features/geofences/components/geofence-form.tsx`
  - `src/features/geofences/components/geofence-map-editor.tsx`
  - `src/features/geofences/components/geofence-vehicle-binder.tsx`
- Done when:
  - vehicle binding is a first-class workflow, not a hidden post-edit panel
  - map editor and assignment surfaces work cleanly on tablet/mobile
  - detail route supports real management follow-through

### BL-019
- Priority: `P1`
- Title: Upgrade maintenance from descriptive widgets to a planning workflow
- Scope:
  - maintenance list/calendar/forecast/detail
- Key files:
  - `src/app/dashboard/maintenance/page.tsx`
  - `src/app/dashboard/maintenance/[id]/page.tsx`
  - `src/features/maintenance/components/maintenance-calendar.tsx`
  - `src/features/maintenance/components/mileage-forecaster.tsx`
- Done when:
  - calendar supports actionable drilldown
  - forecast surface reflects a defensible planning model rather than row index charting
  - detail page includes timeline, cost/task context, and next actions

### BL-020
- Priority: `P1`
- Title: Complete export workflow and result surfaces
- Scope:
  - exports request, progress, result handling
- Key files:
  - `src/app/dashboard/exports/page.tsx`
  - export-related hooks/services used by the page
- Done when:
  - job states show richer progress/failure/result messaging
  - downloads are presented as a proper result surface, not only a plain link
  - operators can distinguish waiting, processing, failed, and completed jobs clearly

### BL-021
- Priority: `P1`
- Title: Complete firmware upload and deployment tracking workflow
- Scope:
  - firmware page
  - upload dialog
  - deployment summary/tracker
- Key files:
  - `src/app/dashboard/firmware/page.tsx`
- Done when:
  - upload form supports a real firmware binary pick/upload flow instead of metadata-only entry
  - upload form explains file/metadata expectations
  - deployment tracker covers the full relevant dataset, not just the first five firmware records
  - progress, completion, and failure states are easy to scan and act on

### BL-021A
- Priority: `P1`
- Title: Standardize mutation pending/error feedback across action-heavy screens
- Scope:
  - alerts
  - firmware
  - maintenance
  - violations
  - notification dropdown and similar quick actions
- Key files:
  - `src/app/dashboard/alerts/page.tsx`
  - `src/app/dashboard/firmware/page.tsx`
  - `src/app/dashboard/maintenance/page.tsx`
  - `src/app/dashboard/violations/page.tsx`
  - `src/features/notifications/components/notification-dropdown.tsx`
- Done when:
  - repeated clicks on mutation actions are visibly constrained during pending work
  - action buttons communicate pending/success/failure consistently
  - fast-path operational actions still remain efficient on desktop and mobile

### BL-022
- Priority: `P1`
- Title: Upgrade system-admin tools from debug viewers to operator-ready tooling
- Scope:
  - logs viewer
  - query builder
  - metrics explorer
  - legacy admin viewers
- Key files:
  - `src/app/dashboard/system-admin/page.tsx`
  - `src/features/system-admin/components/logs-viewer.tsx`
  - `src/features/system-admin/components/logs-filter.tsx`
  - `src/features/system-admin/components/query-builder.tsx`
  - `src/features/system-admin/components/query-results-table.tsx`
  - `src/features/system-admin/components/metrics-explorer.tsx`
  - `src/features/system-admin/components/chart-views/table-view.tsx`
  - `src/features/admin/components/vl-log-viewer.tsx`
  - `src/features/admin/components/vm-query-viewer.tsx`
- Done when:
  - control bars work on mobile/tablet
  - raw JSON/object output is summarized and navigable
  - legacy viewers are either improved, merged, or removed intentionally

### BL-023
- Priority: `P2`
- Title: Upgrade simulator from raw preview tool to guided workflow
- Scope:
  - simulator route and child components
- Key files:
  - `src/app/dashboard/simulator/page.tsx`
  - `src/features/simulator/components/device-selector.tsx`
  - `src/features/simulator/components/data-configurator.tsx`
  - `src/features/simulator/components/simulation-controls.tsx`
  - `src/features/simulator/components/simulation-preview.tsx`
- Done when:
  - device selection and payload preview are easier to scan on smaller screens
  - raw JSON-only previews gain summary framing or structured panels
  - simulator state and action controls remain clear during long runs

## Wave 4: Analytics, Detail Surfaces, And Visual Cohesion

### BL-024
- Priority: `P2`
- Title: Rework statistics and fuel analytics for mobile-safe analytics workflows
- Scope:
  - statistics route/components
  - fuel analytics route/components
- Key files:
  - `src/app/dashboard/statistics/page.tsx`
  - `src/features/statistics/components/statistics-overview.tsx`
  - `src/features/statistics/components/device-uptime-chart.tsx`
  - `src/features/statistics/components/fleet-utilization-chart.tsx`
  - `src/app/dashboard/fuel/page.tsx`
  - `src/features/fuel-analytics/components/fuel-date-filter.tsx`
  - `src/features/fuel-analytics/components/fuel-by-vehicle-chart.tsx`
  - `src/features/fuel-analytics/components/fuel-trends-chart.tsx`
- Done when:
  - filter bars stack cleanly on mobile
  - fixed-height chart ownership is reduced
  - analytics date filters inherit the timezone-safe day handling established in BL-002A
  - analytics and export/report actions remain easy to reach

### BL-025
- Priority: `P2`
- Title: Finish all detail surfaces in the product's command-center style
- Scope:
  - all `[id]` routes
  - modal/sheet detail surfaces
  - detail-oriented tabs
- Key files:
  - `src/app/dashboard/customers/[id]/page.tsx`
  - `src/app/dashboard/devices/[id]/page.tsx`
  - `src/app/dashboard/geofences/[id]/page.tsx`
  - `src/app/dashboard/maintenance/[id]/page.tsx`
  - `src/app/dashboard/trips/[id]/page.tsx`
  - `src/app/dashboard/vehicles/[id]/page.tsx`
  - `src/features/vehicles/components/vehicle-detail-modal.tsx`
  - `src/features/devices/components/device-detail-modal/*`
- Done when:
  - every detail surface has a strong header, summary strip, status, actions, and follow-through
  - placeholder subviews are removed or fully implemented
  - detail pages feel finished, not just informational

### BL-026
- Priority: `P2`
- Title: Extract and apply reusable command-center visual patterns from marketing
- Scope:
  - shared style language
  - dashboard/detail entry points
  - empty/loading/error states
- Key files:
  - `src/features/marketing/components/*`
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - dashboard/detail/notification/map surfaces selected in prior backlog items
- Done when:
  - product interior and marketing exterior feel like one system
  - visual upgrades preserve scan speed on dense operational screens
  - command-center patterns are reusable instead of copy-pasted

### BL-027
- Priority: `P3`
- Title: Clean up navigation and duplicate admin route aliases
- Scope:
  - navigation config
  - alias route behavior
  - job-based grouping
- Key files:
  - `src/config/nav-config.ts`
  - `src/app/dashboard/admin/system/page.tsx`
  - `src/app/dashboard/admin/system-status/page.tsx`
  - `src/app/dashboard/admin/users/page.tsx`
  - sidebar-related layout components
- Done when:
  - primary nav reflects operator/admin job flows more clearly
  - duplicate route aliases are either redirected or intentionally hidden plumbing
  - top tasks are reachable with fewer decisions

### BL-028
- Priority: `P3`
- Title: Final coverage closeout against the exhaustive checklist
- Scope:
  - every domain in `src`
- Key files:
  - `reports/file-implementation-checklist.md`
  - `reports/feature-coverage-summary.md`
  - `reports/file-by-file-ui-ux-audit.md`
- Done when:
  - every `src` file has been changed, verified, or explicitly marked unaffected
  - no high-signal risk domain is left without a matching completed backlog item
  - final UX pass includes desktop and mobile verification
