# Frontend UI/UX Review Plan

## Scope
- App: `iot-vehicle-tracking-system-cloud/Tracking_Frontend`
- Focus: app shell, dashboard, map, tables/lists, notifications, login, copy/accessibility baseline

## Execution status
- Updated on `2026-03-15`
- Completed implementation waves:
  - trust/mobile foundation: shell viewport contract, safe-area handling, primitive touch-target cleanup, honest degraded/error/session UX
  - dense-data foundation: shared table improvements, mobile wrapping, accessible search/column controls
  - copy/style reconciliation: major mojibake cleanup across dashboard, notifications, system-admin, marketing, detail surfaces
  - workflow completion: real firmware upload/deploy flow, notification triage page, maintenance planning filters, vehicle-device assignment, system-admin tooling polish, alert triage pagination
  - closeout sweep: server-backed CRUD/list upgrades for users-customers-drivers-trips-geofences-vehicles-violations, richer export/simulator/analytics surfaces, and detail-surface completion
- Verification:
  - frontend `npm run lint`
  - frontend `npm run typecheck`
  - backend `npm run lint`
  - backend `npm run typecheck`
  - remaining non-code follow-through: manual browser smoke/E2E after the final sweep

## Audit coverage
- Reviewed the full `src` tree: 324 files inventoried, tagged, and cross-checked
- Deep-read every App Router route surface under `src/app`, including alias routes under `src/app/dashboard/admin/*`
- Exhaustive file inventory: `plans/2026-03-15-frontend-ui-ux-review/reports/file-inventory.json`
- Inventory summary: `plans/2026-03-15-frontend-ui-ux-review/reports/inventory-summary.json`
- File-by-file UI/UX audit ledger: `plans/2026-03-15-frontend-ui-ux-review/reports/file-by-file-ui-ux-audit.md`
- Domain heatmap summary: `plans/2026-03-15-frontend-ui-ux-review/reports/feature-coverage-summary.md`
- Exhaustive implementation checklist for every reviewed `src` file: `plans/2026-03-15-frontend-ui-ux-review/reports/file-implementation-checklist.md`
- Brainstorm risk scan: `plans/2026-03-15-frontend-ui-ux-review/reports/brainstorm-risk-scan.md`
- Execution backlog: `plans/2026-03-15-frontend-ui-ux-review/execution-backlog.md`
- Current system-wide counts from the audit ledger:
  - 122 files with mojibake/copy corruption risk
  - 8 files with viewport-contract risk
  - 28 files with fixed-width controls likely to pinch on mobile
  - 40 files with fixed-height panels/charts/drawers
  - 9 files with tab surfaces
  - 31 files with table/list-dense surfaces
  - 24 files with dialog/sheet overlays
  - 172 / 324 files with at least one high-signal UI/UX risk tag

## Coverage heatmap
- `app/dashboard`: 31 files, 22 copy issues, 12 dense-data surfaces, 4 tab surfaces, 4 overlays, 5 input-heavy screens
- `components/ui`: 31 files, 5 copy issues, 5 mobile-width risks, 4 mobile-height risks, 6 overlay primitives, 4 input primitives
- `features/devices`: 50 files, 24 copy issues, 4 mobile-width risks, 4 mobile-height risks, 2 tab surfaces, 4 overlays
- `features/system-admin`: 14 files, 10 copy issues, 5 mobile-width risks, 3 mobile-height risks, 8 dense-data/admin-tool surfaces
- `features/map`: 24 files, 12 copy issues, 2 mobile-width risks, 3 mobile-height risks, 3 input/search surfaces
- `features/notifications`: 12 files, 6 copy issues, 2 mobile-width risks
- `features/marketing`: 8 files, 7 copy issues, 3 mobile-width cues; this matters because it is also the internal style source
- interpretation:
- the highest-risk work is not limited to routes; shared primitives and feature-level subcomponents carry a large share of the mobile and unfinished-state debt
- implementation must track both route surfaces and component families in parallel, using the file checklist as the coverage guardrail

## Strengths
- Shared primitives already exist: `PageContainer`, `StatCard`, `DataTable`, `EmptyState`
- Dashboard + map already have mobile-specific branches instead of desktop-only layouts
- Login form has decent baseline labeling and inline error feedback

## Native style cues to preserve
- Keep the existing "fleet command center" language instead of switching to a generic SaaS dashboard look
- Preserve the dark slate base, teal primary accent, amber secondary accent, soft glass overlays, and rounded container treatment already present in marketing
- Reuse the typography split already wired in app layout: display type for headings, product/body type for longer operational copy
- Reuse the current visual rhythm from marketing: kicker badge, strong section heading, icon tile, elevated card, subtle hover lift, contextual supporting copy
- refs: `src/app/layout.tsx:9-14`, `src/features/marketing/components/landing-header.tsx:14-24`, `src/features/marketing/components/landing-hero.tsx:26-35`, `src/features/marketing/components/landing-hero.tsx:71-90`, `src/features/marketing/components/landing-feature-grid.tsx:21-39`, `src/features/marketing/components/marketing-section-heading.tsx:18-29`

## Findings
### P1
1. Broken Vietnamese copy appears in user-facing screens. This is visible in dashboard, map, notifications, global error, devices, quick actions, recent alerts, activity feed.
   - refs: `src/app/dashboard/page.tsx:34`, `src/features/dashboard/components/overview-stats.tsx:41`, `src/features/dashboard/components/quick-actions.tsx:7`, `src/features/dashboard/components/recent-alerts.tsx:31`, `src/features/dashboard/components/activity-feed.tsx:18`, `src/app/dashboard/map/page.tsx:18`, `src/features/map/components/device-list-panel.tsx:59`, `src/features/map/components/mobile-device-drawer.tsx:51`, `src/app/dashboard/notifications/page.tsx:27`, `src/app/global-error.tsx:14`
   - impact: trust drop, poor readability, inconsistent locale quality

2. Viewport math is brittle. Multiple screens hard-code `100vh` or `calc(100dvh - 4rem)` while the shell adds dynamic header height and optional connection banner.
   - refs: `src/app/dashboard/layout.tsx:24-25`, `src/components/layout/PageContainer.tsx:53`, `src/app/dashboard/map/page.tsx:18`, `src/features/map/components/device-list-panel.tsx:47`, `src/app/login/page.tsx:4`, `src/app/global-error.tsx:12`, `src/components/auth/session-guard.tsx:39`
   - impact: clipped content, nested scroll, layout jumps on mobile/offline/collapsed sidebar states

3. System-wide connection loss is not announced accessibly.
   - ref: `src/components/common/connection-banner.tsx:19-20`
   - impact: users on assistive tech may miss a state change that blocks realtime monitoring

### P2
4. Shared table UX is weak on dense screens.
   - refs: `src/components/common/data-table.tsx:96-131`, `src/components/common/data-table.tsx:134-174`
   - problems:
   - no horizontal overflow wrapper for narrow screens
   - toolbar row does not wrap, so search + filters + column actions can break on small screens
   - column chooser exposes raw `col.id` instead of human labels
   - search input relies on placeholder only, no explicit accessible label

5. Several high-volume pages fetch large client-side lists then filter in memory.
   - refs: `src/app/dashboard/alerts/page.tsx:21-22`, `src/app/dashboard/notifications/page.tsx:20`, `src/app/dashboard/maintenance/page.tsx:32`
   - impact: slower first paint, noisier interactions, poor scale when fleet size grows

6. Notification popover misses basic UX states.
   - ref: `src/features/notifications/components/notification-dropdown.tsx:42-69`
   - problems:
   - no loading state
   - no empty state
   - trigger wiring is more complex than needed

7. Mobile UI branches exist, but several flows are still desktop interactions compressed into smaller width.
   - refs: `src/app/dashboard/devices/page.tsx:51-89`, `src/features/devices/components/mobile-device-header.tsx:5-10`, `src/features/devices/components/mobile-tab-selector.tsx:5-7`, `src/features/notifications/components/notification-filters.tsx:26-94`, `src/features/alerts/components/alert-filters.tsx:15-43`, `src/components/ui/tabs.tsx:21-45`, `src/app/dashboard/settings/page.tsx:33-39`, `src/app/dashboard/maintenance/page.tsx:115-120`, `src/features/devices/components/device-detail-modal/index.tsx:88-95`
   - impact:
   - device page still exposes table mode on mobile while the shared table is not mobile-ready
   - notification and alert filters use fixed widths, so filter bars become tall, cramped, or overflow on small screens
   - tabs use inline-fit layout and can overflow or feel cramped when a screen has 3+ tabs

8. Core mobile touch targets and bottom-sheet spacing are still below the repo's own mobile guidance.
   - refs: `src/components/ui/button.tsx:20-27`, `src/components/ui/tabs.tsx:22`, `src/components/ui/tabs.tsx:57`, `src/components/ui/sheet.tsx:41-57`, `src/features/map/components/mobile-device-drawer.tsx:45-55`
   - impact:
   - many common actions render at 32-36px height instead of near-44px targets
   - sheet and floating map controls do not account for safe-area spacing, so controls can feel cramped near gesture areas
   - a global scan found no `safe-area-inset` handling anywhere in `src`, so this is a systemic mobile primitive gap

9. Desktop map panel and mobile map drawer are inconsistent.
   - refs: `src/features/map/components/device-list-panel.tsx:57-60`, `src/features/map/components/mobile-device-drawer.tsx:55-83`
   - impact: desktop shows empty feedback, mobile shows blank list; drawer height is hard-coded and selected-device content competes with the list for vertical space

### P3
10. Navigation is crowded for a monitoring product.
   - ref: `src/config/nav-config.ts:31-68`
   - impact: too many primary destinations, mixed grouping depth, harder onboarding for dispatch/admin users

11. Marketing and application surfaces are not yet visually reconciled, so the product feels split between a stronger landing identity and a more generic internal shell.
   - refs: `src/app/layout.tsx:9-14`, `src/features/marketing/components/landing-header.tsx:14-24`, `src/features/marketing/components/landing-hero.tsx:35-68`, `src/features/marketing/components/landing-feature-grid.tsx:21-39`
   - impact:
   - marketing already communicates a recognizable command-center style
   - dashboard/detail surfaces are not consistently borrowing that same tone, hierarchy, and accent system
   - feature-detail screens risk feeling unfinished even after functional fixes if visual polish stays generic

12. Placeholder-led forms are still common in CRUD and admin tooling, so forms feel thin, validation-light, and harder to scan on mobile.
   - refs: `src/app/dashboard/customers/page.tsx:62-82`, `src/app/dashboard/firmware/page.tsx:62-86`, `src/app/dashboard/users/page.tsx:135-185`, `src/features/trips/components/trip-form.tsx:49-74`, `src/features/vehicles/components/vehicle-form.tsx:51-77`, `src/features/system-admin/components/query-builder.tsx:94-145`, `src/features/system-admin/components/metrics-explorer.tsx:42-53`
   - impact:
   - label/help text hierarchy is weak once placeholders disappear during typing
   - forms provide little context for required fields, format expectations, or destructive consequences
   - stacked dialogs become cognitively heavy on small screens
   - a global scan found `0` uses of `autoComplete`, `inputMode`, or `spellCheck`, so even login/phone/email flows are missing semantic browser and mobile keyboard hints

13. A number of detail surfaces are still "functional only" or partially stubbed.
   - refs: `src/features/vehicles/components/vehicle-detail-modal.tsx:24-40`, `src/app/dashboard/devices/[id]/page.tsx:38-121`, `src/app/dashboard/vehicles/[id]/page.tsx:38-97`, `src/app/dashboard/maintenance/[id]/page.tsx:38-97`, `src/app/dashboard/customers/[id]/page.tsx:29-89`, `src/app/dashboard/geofences/[id]/page.tsx:33-98`
   - impact:
   - pages answer what the record is, but not what the operator should do next
   - related history, assignments, quick actions, and escalation paths are often missing
   - modal/detail surfaces feel unfinished relative to the rest of the product promise

14. Some features expose state or intent in code without a complete UI affordance.
   - refs: `src/app/dashboard/violations/page.tsx:30-39`, `src/app/dashboard/geofences/page.tsx:133-151`, `src/app/dashboard/firmware/page.tsx:202-210`, `src/features/vehicles/components/vehicle-detail-modal.tsx:38-40`
   - impact:
   - `violations` keeps `typeFilter` state but renders no visible filter control
   - geofence-to-vehicle binding only appears after entering edit mode, so assignment is easy to miss
   - firmware deployment tracking is rendered as a bare bordered list, not a real operational tracker
   - vehicle detail "recent trips" is still placeholder copy instead of an implemented subview

15. Analytics and admin toolbars are especially brittle on narrow screens.
   - refs: `src/features/statistics/components/statistics-overview.tsx:55-106`, `src/features/system-admin/components/logs-filter.tsx:28-60`, `src/features/system-admin/components/metrics-explorer.tsx:49-90`, `src/features/system-admin/components/query-builder.tsx:74-147`, `src/app/dashboard/trips/[id]/page.tsx:82-100`
   - impact:
   - multiple control rows rely on fixed widths and `ml-auto` layout tricks
   - desktop-first filtering/query workflows wrap into tall, awkward stacks on phone widths
   - admin/operator tools will feel harder than necessary in field use or tablet use

16. Fixed-height maps, charts, logs, and previews still dominate many detail/analytics screens.
   - refs: `src/features/trips/components/trip-detail.tsx:19-46`, `src/features/statistics/components/device-uptime-chart.tsx:29`, `src/features/statistics/components/fleet-utilization-chart.tsx:22`, `src/features/system-admin/components/chart-views/line-chart-view.tsx:35`, `src/features/simulator/components/simulation-preview.tsx:30`, `src/features/map/components/mobile-device-drawer.tsx:55-67`
   - impact:
   - tall visual blocks push key actions below the first viewport on mobile
   - screen ownership becomes unclear when map/chart + controls + table all want fixed height
   - tablet portrait layouts will likely feel more cramped than desktop assumptions suggest

17. Duplicate admin route aliases increase IA noise without adding UX value.
   - refs: `src/app/dashboard/admin/system/page.tsx:1`, `src/app/dashboard/admin/system-status/page.tsx:1`, `src/app/dashboard/admin/users/page.tsx:1`
   - impact:
   - multiple URLs lead to the same surfaces
   - nav/help/docs can drift if both path families survive
   - users may perceive duplicate modules instead of aliases

18. Some monitoring surfaces synthesize fallback telemetry instead of surfacing degraded or unavailable states.
   - refs: `src/features/system-status/hooks/use-system-status.ts:43-80`, `src/features/dashboard/hooks/use-dashboard-stats.ts:140-232`
   - impact:
   - operators may read generated metrics as real infrastructure health
   - dashboard trust drops when inferred charts silently replace unavailable endpoints
   - this is a product integrity issue, not just a presentation issue

19. Settings currently behaves like a thin mutation shell more than a real account center.
   - refs: `src/app/dashboard/settings/page.tsx:14-30`, `src/features/settings/components/profile-form.tsx:20-27`, `src/features/settings/components/password-form.tsx:20-45`, `src/features/settings/components/notification-prefs.tsx:13-30`
   - impact:
   - profile and notification values start from hard-coded defaults instead of hydrated server state
   - save flows provide little confirmation, error guidance, or auditability
   - the settings area feels incomplete for a production admin/operator product

20. Notification center is still mostly a dropdown wrapper, not a complete operational center.
   - refs: `src/features/notifications/components/notification-center.tsx:4-6`, `src/features/notifications/components/notification-dropdown.tsx:20-69`, `src/features/notifications/components/notification-list.tsx:45-103`, `src/features/notifications/hooks/use-notifications.ts:4-8`
   - impact:
   - center and dropdown are nearly the same surface instead of complementary surfaces
   - data is capped and polled in a basic way without grouping, pagination, or drill-in behavior
   - operators get a feed, but not a true alert triage workflow

21. Several admin/simulator tools still expose raw JSON or thin "viewer" shells rather than operator-ready tools.
   - refs: `src/features/admin/components/vl-log-viewer.tsx:8-13`, `src/features/admin/components/vm-query-viewer.tsx:14-19`, `src/features/system-admin/components/query-results-table.tsx:18-44`, `src/features/simulator/components/simulation-preview.tsx:13-45`
   - impact:
   - interfaces are useful for debugging but not yet shaped for repeated operational use
   - object-heavy responses are truncated or dumped without schema help, actions, or summary framing
   - small-screen usability degrades sharply on these raw-data views

22. Maintenance "calendar" and "forecast" are currently descriptive widgets, not complete maintenance management tools.
   - refs: `src/features/maintenance/components/maintenance-calendar.tsx:27-41`, `src/features/maintenance/components/mileage-forecaster.tsx:4-27`
   - impact:
   - calendar is mainly a date filter plus flat list, with no quick actions or drilldown
   - forecaster charts the first 30 rows by index instead of presenting a robust forecast model
   - the feature label promises more than the workflow currently delivers

23. Firmware and export tracking are only partially realized workflows.
   - refs: `src/app/dashboard/firmware/page.tsx:106-116`, `src/app/dashboard/firmware/page.tsx:202-210`, `src/app/dashboard/exports/page.tsx:219-245`
   - impact:
   - firmware deployment summary only samples the first five firmware records
   - deployment/export jobs lack deeper failure detail, retry/escalation affordances, and richer tracking anatomy
   - completed exports still resolve to a plain link rather than a stronger download/result surface

24. Firmware upload UI does not expose a real file-pick/upload flow yet.
   - refs: `src/app/dashboard/firmware/page.tsx:41-49`, `src/app/dashboard/firmware/page.tsx:61-86`
   - impact:
   - the screen asks for filename, size, and hash manually instead of handling the firmware binary directly
   - this looks like a metadata form, not an actual upload workflow
   - users can easily enter inconsistent file metadata and still believe they uploaded a package

25. Some latent capabilities exist in code but are not surfaced or are wired misleadingly in UI.
   - refs: `src/features/devices/components/device-detail-modal/modal-context.tsx:44-49`, `src/features/devices/components/device-detail-modal/modal-container.tsx:105-109`, `src/features/devices/components/device-detail-modal/index.tsx:74-77`, `src/features/vehicles/components/vehicle-assign-device.tsx:18-59`
   - impact:
   - device detail context exposes command/export hooks that are barely or not fully surfaced to users
   - the current "Làm mới" action only switches tabs back to overview instead of truly refetching data
   - `VehicleAssignDevice` exists as a feature surface but does not appear integrated into the visible vehicle workflow

26. Mutation feedback and duplicate-submit protection are inconsistent across the app.
   - refs: `src/app/dashboard/alerts/page.tsx`, `src/app/dashboard/firmware/page.tsx`, `src/app/dashboard/maintenance/page.tsx`, `src/app/dashboard/violations/page.tsx`, `src/features/notifications/components/notification-dropdown.tsx`
   - impact:
   - several mutation-driven actions have no visible pending state or double-submit protection
   - destructive or repeated operations can feel ambiguous on slow networks
   - the UX quality gap is especially visible between older CRUD screens and newer form patterns

27. Day-based filters and calendar logic are timezone-brittle.
   - refs: `src/features/dashboard/hooks/use-dashboard-stats.ts:77-108`, `src/features/fuel-analytics/hooks/use-fuel-analytics.ts:11-12`, `src/features/statistics/hooks/use-statistics.ts:16-17`, `src/features/maintenance/components/maintenance-calendar.tsx:31-34`, `src/app/dashboard/maintenance/page.tsx:69`
   - impact:
   - several defaults and day comparisons depend on `toISOString().slice(0, 10)` or raw string slicing
   - analytics, dashboard trends, and maintenance day matching can drift by one day around timezone boundaries
   - this is a data-trust issue as well as a UX issue because the UI can show the wrong local day window

28. Auth/session-expiry transitions are functional but abrupt.
   - refs: `src/lib/api/client.ts:63-68`, `src/components/nav-user.tsx:28-36`, `src/features/auth/components/login-form.tsx:19-23`
   - impact:
   - failed refresh currently hard-redirects users to login instead of showing an in-product expired-session state
   - route context is partly preserved, but transient form/filter state and feedback can still be lost
   - long-running operator work can feel interrupted rather than gracefully recoverable

## Roadmap
### Phase 1 - Fix trust breakers
- Normalize all Vietnamese strings to UTF-8 and move recurring labels to shared locale constants
- Patch global/system states: connection banner live region, error pages, offline/loading copy
- Audit top-level screens for broken copy first: dashboard, map, notifications, devices, global error
- Replace UTC-sliced local-day logic in dashboard/statistics/fuel/maintenance with one explicit timezone-safe day policy

### Phase 2 - Align visual language with the existing product style
- Extract a small shared "command center" visual kit from `features/marketing` for reuse in dashboard/mobile surfaces
- Keep what already works in marketing: dark slate atmosphere, teal/amber accents, glass cards, display headings, section kickers, icon tiles
- Apply style by adaptation, not cloning: dense operational screens should inherit tone and hierarchy without hurting scan speed
- Define which surfaces should adopt the stronger style first: dashboard overview, map side panels/drawers, notifications, detail modals/sheets, empty/error/loading states

### Phase 3 - Stabilize shell and viewport behavior
- Replace hard-coded page heights with one shell contract using CSS vars for header/banner heights
- Use `100dvh` consistently where full-height panels are intentional
- Remove conflicting nested scroll regions where possible; keep one primary scroll owner per screen
- Add mobile safe-area spacing and keep primary actions reachable without header/banner overlap
- Raise frequently used mobile touch targets toward the repo's 44px guidance
- Make sheet/drawer/footer primitives safe-area-aware at the shared-component level instead of patching screens one by one

### Phase 4 - Upgrade dense-data UX
- Refactor `DataTable` into responsive modes: horizontal scroll, compact mobile summary rows, better column labels
- Add explicit labels for table search and bulk actions
- Move alerts/notifications/maintenance to server-driven filter + pagination model
- Replace wrap-heavy mobile filter bars with filter sheets/drawers on dense pages
- Prefer card/list-first mobile views where the current table mode does not support core tasks well
- Make toolbar rows wrap or stack predictably on small screens instead of relying on one horizontal line
- Replace placeholder-led dialogs with labeled field groups, helper text, validation, and clearer submit semantics
- Audit every `limit: 200/300` page and move high-volume lists to backend-backed filters or progressive loading
- Add semantic form/input hints such as `autoComplete`, `inputMode`, and correct input types for username, password, email, phone, and numeric fields

### Phase 5 - Mobile operator flows
- Redesign mobile map flow: one compact device trigger, one scroll owner, clear empty state, persistent selected-device summary
- Make multi-tab mobile screens horizontally scrollable or collapse secondary tabs into segmented menus/actions
- Simplify mobile device detail modal so critical tabs/actions stay in first viewport
- Review touch targets and thumb reach for header actions, map controls, bulk actions
- Rework analytics/admin control bars so date filters, selects, and action buttons stack intentionally instead of pinching into one row
- Reduce fixed-height chart/map ownership on mobile; prefer collapsible panels, shorter default heights, or progressive reveal

### Phase 6 - Complete detail surfaces in the original style
- Polish device detail, vehicle detail, notifications, settings, system-admin, maintenance subviews with the same visual grammar instead of leaving them as default cards/forms
- Standardize detail-surface anatomy: strong header, status pill, summary strip, primary actions, secondary tabs, contextual empty state, next-step CTA
- Upgrade micro-details: divider treatment, icon containers, spacing rhythm, status emphasis, hover/focus feedback, skeleton/loading composition
- Reuse marketing-derived section heading and card patterns where they help orientation, especially on overview and detail entry points
- Replace placeholder subviews and dead-end tabs with real related-data sections, or remove them until implemented
- Add route-level completion passes for customer, vehicle, device, trip, geofence, and maintenance detail screens

### Phase 7 - Improve monitoring workflows
- Redesign notification center with loading, empty, unread grouping, and clearer jump targets
- Unify map desktop/mobile device list states and filters
- Rework dashboard cards/quick actions around primary operator tasks instead of generic shortcuts
- Finish operational surfaces that currently stop short of the task: violation filters, firmware deployment tracker, geofence vehicle assignment visibility, export job completion/download states
- Soften session-expiry/logout transitions with clearer messaging and better preservation of task context

### Phase 8 - Information architecture cleanup
- Collapse sidebar into fewer job-based groups
- Separate operator flows from admin/setup flows
- Promote map, alerts, trips, notifications as core monitoring loop; demote infrequent tools
- Decide whether `dashboard/admin/*` remains as real IA or becomes hidden alias/redirect-only plumbing

## Route-specific backlog
- `src/app/page.tsx`: landing shell is the visual reference; keep it as the tone source for app polish.
- `src/app/login/page.tsx`: strong form baseline, but full-height math still risks clipping around header/banner/safe area, and auth-expiry return flow should preserve context more gracefully.
- `src/app/dashboard/page.tsx`: overview composition is directionally good, but copy corruption and generic secondary cards reduce trust.
- `src/app/dashboard/alerts/page.tsx`: dense table screen still needs backend-driven filtering, better mobile filter ergonomics, and detail-state polish.
- `src/app/dashboard/customers/page.tsx`: customer CRUD dialog uses placeholder-led fields and 200-row client fetch; needs labels, validation, and mobile form structure.
- `src/app/dashboard/customers/[id]/page.tsx`: summary-only detail page needs actions, related assets, and history/timeline.
- `src/app/dashboard/devices/page.tsx`: mobile-specific branch exists, but table mode and dense detail flows still expose desktop assumptions.
- `src/app/dashboard/devices/[id]/page.tsx`: generic read-only detail page; lacks related sessions, actions, and richer status treatment.
- `src/app/dashboard/drivers/page.tsx`: copy corruption and client-side 200 fetch remain; confirm form/list mobile rhythm after encoding cleanup.
- `src/app/dashboard/exports/page.tsx`: live progress is valuable, but request dialog and job table still feel administrative instead of operational.
- `src/app/dashboard/firmware/page.tsx`: upload dialog is too thin; deployment monitoring needs real tracking/status grouping, the current summary only samples the first five firmware records, and the UI still lacks a real binary file upload affordance.
- `src/app/dashboard/fuel/page.tsx`: wrapper is small, but delegated chart/filter surfaces need the same mobile and copy cleanup as statistics, plus timezone-safe default date windows.
- `src/app/dashboard/geofences/page.tsx`: vehicle binding is hidden behind edit state; editor/binder flow needs much clearer assignment UX.
- `src/app/dashboard/geofences/[id]/page.tsx`: detail page is informational only; missing active assignments and quick management actions.
- `src/app/dashboard/maintenance/page.tsx`: 300-row fetch plus tabs plus list/calendar/forecast creates mobile overload; IA needs simplification, and day matching should stop depending on UTC-sliced date strings.
- `src/app/dashboard/maintenance/[id]/page.tsx`: detail page needs timeline, parts/cost breakdown, and direct next actions.
- `src/app/dashboard/map/page.tsx`: viewport contract and desktop/mobile parity remain the biggest shell-level UX risk.
- `src/app/dashboard/notifications/page.tsx`: filter bar and notification-center states still need server-backed scale and mobile cleanup.
- `src/app/dashboard/settings/page.tsx`: tab navigation and placeholder-led account forms need mobile-first restructuring, plus hydration from real profile/preference data and stronger save-state feedback.
- `src/app/dashboard/simulator/page.tsx`: useful admin tool, but the current stacked control + preview flow is long and rigid on mobile/tablet, and preview/history still lean on raw JSON.
- `src/app/dashboard/statistics/page.tsx`: charts are useful, but fixed-width filters and fixed-height visuals still read as desktop-first, and the date range model should be verified against local-day expectations.
- `src/app/dashboard/system-admin/page.tsx`: tabs and deeper tools are cramped on mobile; query/log/metrics surfaces need stronger affordances and polish.
- `src/app/dashboard/system-status/page.tsx`: mojibake harms trust; status cards need clearer alerting hierarchy and richer freshness/error messaging, and synthetic fallback metrics should be replaced with explicit degraded-state UX.
- `src/app/dashboard/trips/page.tsx`: 200-row fetch and placeholder-led trip dialog need a fuller operational workflow.
- `src/app/dashboard/trips/[id]/page.tsx`: top summary row, replay controls, and tall visuals need a mobile-specific composition.
- `src/app/dashboard/users/page.tsx`: dense admin table plus placeholder-led modal needs labeling, hierarchy, and backend-scale improvements.
- `src/app/dashboard/vehicles/page.tsx`: client-side 200 fetch and incomplete detail modal keep the feature feeling half-finished; also verify whether device assignment flow is actually surfaced or still stranded as an unused dialog component.
- `src/app/dashboard/vehicles/[id]/page.tsx`: detail page needs assignment/maintenance/trip context instead of static info only.
- `src/app/dashboard/violations/page.tsx`: visible violation-type filtering is missing even though state exists; also affected by copy corruption and dense-table issues.
- `src/app/dashboard/admin/system/page.tsx`: alias route only; avoid treating it as a separate UX surface.
- `src/app/dashboard/admin/system-status/page.tsx`: alias route only; IA duplication should be resolved in nav/docs.
- `src/app/dashboard/admin/users/page.tsx`: alias route only; IA duplication should be resolved in nav/docs.

## Component-family backlog
- Shared shell/layout: stabilize one viewport contract across `PageContainer`, dashboard layout, map shell, login, and error pages.
- Shared data surfaces: harden `DataTable`, column chooser labels, empty/loading states, toolbar stacking, and mobile summary modes.
- Forms/dialogs/sheets: replace placeholder-only patterns, improve helper/error copy, raise touch targets, and respect safe-area spacing.
- Detail surfaces: unify anatomy across device, vehicle, customer, geofence, maintenance, and trip detail experiences.
- Analytics/admin tools: convert fixed-width filter bars and fixed-height output panels into responsive, progressive layouts.
- Marketing-derived polish: extract reusable heading/card/status patterns from `features/marketing` and apply them selectively to app surfaces.

## Feature-directory backlog
- `features/admin`: legacy admin viewers are small but still contain hard height and raw-code presentation; verify whether they stay, merge into system-admin, or get removed.
- `features/alerts`: finish alert filters for mobile, align detail modal polish, and sync severity/status patterns with notifications and dashboard alerts.
- `features/auth`: preserve current login quality baseline while bringing copy, viewport behavior, semantic autofill hints, and session-expiry UX in line with the rest of the shell.
- `features/dashboard`: fix copy corruption, review all chart/card heights, and turn overview cards/feeds into stronger command-center entry points.
- `features/devices`: highest-volume feature backlog after routes; review filters, mobile tab selector, detail modal tabs, chart heights, error-code table, loading/empty states, mobile-first device workflows, and latent command/refresh/export actions that are not fully surfaced.
- `features/drivers`: after copy cleanup, verify form quality, list ergonomics, and whether driver detail/actions are sufficient for real operations.
- `features/fuel-analytics`: convert date/filter controls to mobile-safe stacking, reduce fixed-height chart pressure on narrow screens, and remove UTC-based default date drift.
- `features/geofences`: strengthen form clarity, map-editor ergonomics, and especially assignment visibility between geofence and vehicles.
- `features/maintenance`: simplify calendar/forecast/list interplay, keep forecast charts readable on mobile, replace descriptive calendar/forecast widgets with real drilldown + planning workflows, and normalize day comparisons to a timezone-safe rule.
- `features/map`: unify desktop/mobile list, search/filter, selected-device summary, drawer safe-area, and map overlay hierarchy.
- `features/marketing`: preserve as visual source-of-truth, but clean copy corruption before extracting reusable visual patterns into app surfaces.
- `features/notifications`: redesign filters, list states, popover center, grouping, and action hierarchy for dense operational use on both desktop and mobile; split "dropdown glance" from "real triage center" more clearly.
- `features/settings`: restructure profile/password/account tabs for mobile, add clearer field labeling and section hierarchy, and hydrate current values/preferences from the backend instead of defaults.
- `features/simulator`: reduce mobile/tablet rigidity across device selector, configurator, controls, and preview/history panes; replace raw JSON-heavy preview with more task-oriented inspection.
- `features/statistics`: rework toolbar and chart ownership for mobile while keeping export/report actions available, and normalize default date windows away from UTC string slicing.
- `features/system-admin`: highest admin-tool risk area; fix copy, filter/query/metrics control bars, table overflow, chart/table mode toggles for small screens, and raw result presentation.
- `features/system-status`: improve copy integrity, service freshness messaging, and severity hierarchy so the screen reads as trustworthy health telemetry, without generated fallback numbers masquerading as live data.
- `features/trips`: complete trip form UX, strengthen replay/detail mobile composition, and make route/history views feel like a real operator tool.
- `features/vehicles`: complete vehicle detail modal/page, assignment/device/trip context, remove placeholder subviews, and either integrate or remove the dormant assign-device dialog path.

## Shared-directory backlog
- `components/common`: this is the most reused UX layer after primitives; `DataTable`, `StatCard`, `ConfirmDialog`, `ConnectionBanner`, and `EmptyState` should be treated as system-wide multipliers, along with consistent pending/disabled feedback for mutation actions.
- `components/layout`: fix scroll ownership, sidebar/header consistency, and notification affordances before polishing downstream routes.
- `components/ui`: normalize touch targets, tab overflow, dialog/sheet safe-area behavior, select/dropdown width assumptions, input semantics, and shared safe-area tokens for edge-attached mobile surfaces.
- `components/kbar`: lower priority, but still verify modal sizing and keyboard-search usability on smaller screens.
- `components/map`: confirm whether these wrappers are active or legacy; if active, align them with current map UX rules, if not, prune or document.
- `components/providers`: mostly support code, but validate that provider-driven states do not block loading/error/offline UX improvements.
- `src/hooks`: treat as verification coverage for data-state assumptions, polling, realtime refresh, role-gated UX branches, and date-range/timezone assumptions for day-based screens.
- `src/lib`: mostly backend/service code, but confirm list endpoints, pagination contracts, formatting helpers, and auth/session transition behavior support the planned UI changes.
- `src/config`: nav and app-level config must match the IA cleanup.
- `src/types`: keep aligned with richer UI states so new detail/loading/error variants do not drift from types.

## Execution control
- Use `file-implementation-checklist.md` as the source of truth during implementation so every `src` file is either changed, verified, or explicitly left untouched with reason.
- Use `execution-backlog.md` as the ordered implementation queue; each backlog item should close the corresponding checklist rows before moving on.
- Work in vertical slices, but close each slice against shared primitives before moving on:
- foundation slice: app shell, layout, `components/ui`, `components/common`
- operator slice: dashboard, map, alerts, notifications, trips, devices
- admin slice: users, exports, firmware, simulator, system-admin, system-status
- detail slice: all `[id]` routes and modal/sheet detail surfaces
- style slice: marketing-derived polish pass across dashboard and detail entry points
- Before declaring the UI pass complete, compare implementation back against:
- route-specific backlog
- component-family backlog
- feature heatmap
- exhaustive file checklist

## Success metrics
- No mojibake text on any user-facing route
- No clipped viewport on login, dashboard, map, error, offline states
- Tables usable on mobile without hidden columns breaking core tasks
- Dense mobile screens no longer require 3-4 wrapped filter/control rows before content appears
- Multi-tab pages remain usable on <=390px width without tab overflow or micro-targets
- Day-based filters, defaults, and calendars match the user's local day without timezone drift
- Shared mobile overlays respect safe-area/gesture zones
- Forms expose appropriate labels, input types, and browser/mobile autofill hints for common fields
- Dashboard/detail screens feel visually consistent with the existing marketing language instead of looking like a separate product
- Key detail surfaces no longer stop at "functional only"; they read as finished command-center features
- Alerts/notifications remain responsive with 1k+ records backend-side
- First-time users can reach map, alerts, trips, notifications in <=2 navigation decisions

## Unresolved questions
- Primary persona first: dispatcher, fleet manager, or system admin?
- Mobile web importance for real operators vs mostly desktop control room?
- Which routes are highest traffic in production now: dashboard, map, alerts, devices, or notifications?
