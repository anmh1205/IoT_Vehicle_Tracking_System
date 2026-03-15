# Brainstorm Risk Scan

## Purpose
- This report captures additional risk hypotheses brainstormed after the first audit pass.
- Each hypothesis was then checked against the frontend codebase to confirm whether the pattern exists.

## Confirmed risk patterns

### 1. Features that look complete in navigation but are still only thin wrappers
- Hits:
  - `src/features/notifications/components/notification-center.tsx`
  - `src/features/admin/components/vl-log-viewer.tsx`
  - `src/features/admin/components/vm-query-viewer.tsx`
- What it means:
  - some modules expose a named feature surface but the UX is still just a wrapper or raw viewer
  - users may assume they are entering a full workflow when they are actually getting a minimal shell

### 2. Placeholder or view-only detail tabs
- Hits:
  - `src/features/vehicles/components/vehicle-detail-modal.tsx`
  - `src/app/dashboard/devices/[id]/page.tsx`
  - `src/app/dashboard/vehicles/[id]/page.tsx`
  - `src/app/dashboard/maintenance/[id]/page.tsx`
  - `src/app/dashboard/customers/[id]/page.tsx`
  - `src/app/dashboard/geofences/[id]/page.tsx`
- What it means:
  - detail surfaces answer “what is this record” but not “what can I do next”
  - some tabs still carry placeholder copy or read-only content without follow-through

### 3. Workflow labels that over-promise relative to the actual implementation
- Hits:
  - `src/features/maintenance/components/maintenance-calendar.tsx`
  - `src/features/maintenance/components/mileage-forecaster.tsx`
  - `src/app/dashboard/firmware/page.tsx`
- What it means:
  - “calendar”, “forecast”, and “upload” imply stronger workflows than the current UI actually delivers
  - the gap is not just polish; it changes user expectations and trust

### 4. Metadata forms standing in for real file workflows
- Hits:
  - `src/app/dashboard/firmware/page.tsx:41-86`
- What it means:
  - firmware upload currently asks for file metadata manually
  - no real file picker was found in the frontend scan for this flow

### 5. Synthetic or inferred telemetry silently replacing unavailable data
- Hits:
  - `src/features/system-status/hooks/use-system-status.ts`
  - `src/features/dashboard/hooks/use-dashboard-stats.ts`
- What it means:
  - fallback-derived metrics and charts can be mistaken for live data
  - this is a product-integrity risk, not only a UX nuance

### 6. Raw JSON/object dumps used as user-facing surfaces
- Hits:
  - `src/features/admin/components/vl-log-viewer.tsx`
  - `src/features/admin/components/vm-query-viewer.tsx`
  - `src/features/system-admin/components/query-results-table.tsx`
  - `src/features/simulator/components/simulation-preview.tsx`
- What it means:
  - several admin/debug workflows are still operator-unfriendly
  - they become especially rough on smaller screens

### 7. Latent capabilities present in hooks/context but not fully surfaced in UI
- Hits:
  - `src/features/devices/components/device-detail-modal/modal-context.tsx`
  - `src/features/devices/components/device-detail-modal/modal-container.tsx`
  - `src/features/vehicles/components/vehicle-assign-device.tsx`
- What it means:
  - command/export/assignment capability exists in code, but some affordances are absent or loosely wired
  - this often creates “we already support that” assumptions that the visible product does not yet justify

### 8. Misleading actions that do less than the label suggests
- Hits:
  - `src/features/devices/components/device-detail-modal/index.tsx:74-77`
- What it means:
  - the current “Làm mới” action changes tab state rather than clearly refetching data
  - this is a subtle trust issue because the label implies a stronger action than the code performs

### 9. Mutation-heavy screens with inconsistent pending-state protection
- Hits:
  - `src/app/dashboard/alerts/page.tsx`
  - `src/app/dashboard/firmware/page.tsx`
  - `src/app/dashboard/maintenance/page.tsx`
  - `src/app/dashboard/violations/page.tsx`
  - `src/features/notifications/components/notification-dropdown.tsx`
- What it means:
  - action-heavy operational surfaces do not always block repeat submissions or communicate pending work clearly
  - slow networks can turn this into uncertainty or duplicate attempts

### 10. State initialized from props but not visibly synchronized in follow-up opens/edits
- Hits:
  - `src/features/vehicles/components/vehicle-assign-device.tsx`
- What it means:
  - the dialog initializes local selection from `currentDeviceId`, but no sync path was found for later prop changes
  - this can create stale assignment state if the dialog is reused

### 11. Day-based filters and calendars rely on UTC string slicing
- Hits:
  - `src/features/dashboard/hooks/use-dashboard-stats.ts`
  - `src/features/fuel-analytics/hooks/use-fuel-analytics.ts`
  - `src/features/statistics/hooks/use-statistics.ts`
  - `src/features/maintenance/components/maintenance-calendar.tsx`
  - `src/app/dashboard/maintenance/page.tsx`
- What it means:
  - several default date ranges and day comparisons use `toISOString().slice(0, 10)` or string slicing
  - local users can see off-by-one day behavior around timezone boundaries or late-night usage
  - this is a trust/integrity issue because analytics and maintenance windows can silently drift

### 12. Mobile edge-attached surfaces have no safe-area implementation anywhere in `src`
- Hits:
  - global scan result: no `safe-area-inset` / `env(safe-area-inset-*)` usage found
  - impacted surfaces include `src/components/ui/sheet.tsx` and `src/features/map/components/mobile-device-drawer.tsx`
- What it means:
  - bottom sheets, mobile drawers, and edge controls are not protected from gesture/home-indicator zones
  - this confirms the mobile spacing issue is systemic, not just one component variant

### 13. Forms are missing semantic autofill and input-hint wiring
- Hits:
  - global scan result: `autoComplete=0`, `inputMode=0`, `spellCheck=0`
  - `src/features/auth/components/login-form.tsx`
  - `src/features/vehicles/components/vehicle-form.tsx`
  - `src/app/dashboard/customers/page.tsx`
- What it means:
  - even login and CRUD flows do not expose browser/mobile hints like username/password autocomplete or phone/email keyboard hints
  - phone/email fields often render as plain text inputs, which slows entry and weakens mobile ergonomics
  - this compounds the existing placeholder-led form problem

### 14. Auth/session expiry redirects are abrupt and can drop work context
- Hits:
  - `src/lib/api/client.ts`
  - `src/components/nav-user.tsx`
  - `src/features/auth/components/login-form.tsx`
- What it means:
  - failed refresh currently hard-redirects to `/login?redirect=...` via `window.location.href`
  - users are returned to route context, but in-page form/filter state and transient feedback can still be lost
  - logout/session-expiry UX is functional, but not yet graceful for long-running operator work

## Result
- Confirmed patterns were folded back into:
  - `plan.md`
  - `execution-backlog.md`
- The main additions affected:
  - firmware workflow completion
  - device command/refresh affordances
  - notification-center maturity
  - settings hydration/feedback
  - mutation pending-state consistency
  - timezone-safe day handling for analytics and maintenance
  - semantic form input/autofill coverage
  - safe-area-aware mobile overlays
  - gentler auth/session-expiry transitions
