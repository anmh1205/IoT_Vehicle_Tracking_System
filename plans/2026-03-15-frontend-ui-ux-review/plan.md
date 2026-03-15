# Frontend UI/UX Review Plan

## Scope
- App: `iot-vehicle-tracking-system/Tracking_Frontend`
- Focus: app shell, dashboard, map, tables/lists, notifications, login, copy/accessibility baseline

## Strengths
- Shared primitives already exist: `PageContainer`, `StatCard`, `DataTable`, `EmptyState`
- Dashboard + map already have mobile-specific branches instead of desktop-only layouts
- Login form has decent baseline labeling and inline error feedback

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

9. Desktop map panel and mobile map drawer are inconsistent.
   - refs: `src/features/map/components/device-list-panel.tsx:57-60`, `src/features/map/components/mobile-device-drawer.tsx:55-83`
   - impact: desktop shows empty feedback, mobile shows blank list; drawer height is hard-coded and selected-device content competes with the list for vertical space

### P3
10. Navigation is crowded for a monitoring product.
   - ref: `src/config/nav-config.ts:31-68`
   - impact: too many primary destinations, mixed grouping depth, harder onboarding for dispatch/admin users

## Roadmap
### Phase 1 - Fix trust breakers
- Normalize all Vietnamese strings to UTF-8 and move recurring labels to shared locale constants
- Patch global/system states: connection banner live region, error pages, offline/loading copy
- Audit top-level screens for broken copy first: dashboard, map, notifications, devices, global error

### Phase 2 - Stabilize shell and viewport behavior
- Replace hard-coded page heights with one shell contract using CSS vars for header/banner heights
- Use `100dvh` consistently where full-height panels are intentional
- Remove conflicting nested scroll regions where possible; keep one primary scroll owner per screen
- Add mobile safe-area spacing and keep primary actions reachable without header/banner overlap
- Raise frequently used mobile touch targets toward the repo's 44px guidance

### Phase 3 - Upgrade dense-data UX
- Refactor `DataTable` into responsive modes: horizontal scroll, compact mobile summary rows, better column labels
- Add explicit labels for table search and bulk actions
- Move alerts/notifications/maintenance to server-driven filter + pagination model
- Replace wrap-heavy mobile filter bars with filter sheets/drawers on dense pages
- Prefer card/list-first mobile views where the current table mode does not support core tasks well
- Make toolbar rows wrap or stack predictably on small screens instead of relying on one horizontal line

### Phase 4 - Mobile operator flows
- Redesign mobile map flow: one compact device trigger, one scroll owner, clear empty state, persistent selected-device summary
- Make multi-tab mobile screens horizontally scrollable or collapse secondary tabs into segmented menus/actions
- Simplify mobile device detail modal so critical tabs/actions stay in first viewport
- Review touch targets and thumb reach for header actions, map controls, bulk actions

### Phase 5 - Improve monitoring workflows
- Redesign notification center with loading, empty, unread grouping, and clearer jump targets
- Unify map desktop/mobile device list states and filters
- Rework dashboard cards/quick actions around primary operator tasks instead of generic shortcuts

### Phase 6 - Information architecture cleanup
- Collapse sidebar into fewer job-based groups
- Separate operator flows from admin/setup flows
- Promote map, alerts, trips, notifications as core monitoring loop; demote infrequent tools

## Success metrics
- No mojibake text on any user-facing route
- No clipped viewport on login, dashboard, map, error, offline states
- Tables usable on mobile without hidden columns breaking core tasks
- Dense mobile screens no longer require 3-4 wrapped filter/control rows before content appears
- Multi-tab pages remain usable on <=390px width without tab overflow or micro-targets
- Alerts/notifications remain responsive with 1k+ records backend-side
- First-time users can reach map, alerts, trips, notifications in <=2 navigation decisions

## Unresolved questions
- Primary persona first: dispatcher, fleet manager, or system admin?
- Mobile web importance for real operators vs mostly desktop control room?
- Which routes are highest traffic in production now: dashboard, map, alerts, devices, or notifications?
