# Phase 3: State URL And Navigation Contract

## Goal
Make the map restorable and sharable through URL-driven state where it matters.

## Tasks
1. Split state into:
   - shareable URL state
   - local transient UI state
2. Define URL keys for:
   - selected device
   - viewport center and zoom
   - map layer
   - follow mode
   - geofence visibility
   - active map panel or edit mode where needed
3. Define synchronization rules:
   - initial read from URL
   - push/replace behavior
   - invalid state fallback
4. Define drill-down navigation contract from map to detail pages.

## Output
- URL schema
- sync rules
- invalid-state handling rules
- migration notes for `map-store.ts`

## Acceptance
- a refreshed tab can reconstruct meaningful map context
- local-only transient state is explicitly documented
