# Phase 02 — Frontend Server-Driven Table State

## Context Links
- Shared table: `Tracking_Frontend/src/components/common/data-table.tsx`
- Alerts page: `Tracking_Frontend/src/app/dashboard/alerts/page.tsx`
- Violations page: `Tracking_Frontend/src/app/dashboard/violations/page.tsx`
- Maintenance page: `Tracking_Frontend/src/app/dashboard/maintenance/page.tsx`

## Overview
Priority: High  
Status: Planned  
Move affected search/filter controls out of local page-row filtering and into React Query params.

## Requirements
- Search input must reset page to 1 and refetch server list.
- Query keys must include all server-impacting filters/search.
- Do not keep local `DataTable` search on server-paginated data.

## Implementation Steps
1. Decide lowest-impact search UI approach:
   - Option A: Add optional controlled props to `DataTable`: `searchValue`, `onSearchChange`, `manualSearch`.
   - Option B: Remove `searchKey` from affected pages and render controlled search input in page toolbar.
2. Prefer Option B if it touches fewer shared-table behaviors.
3. Alerts:
   <!-- Updated: Validation Session 1 - alert source semantics -->
   - Add controlled search state if current UI has search.
   - Pass UI `source=obd/system` and search to `alertServices.getList()` once backend supports the OBD heuristic.
   - Remove local `rows.filter(...)` source filtering.
4. Violations:
   - Add `search` state, include in `violationServices.getList()` params/query key.
   - Remove `searchKey` usage from `DataTable`.
5. Maintenance:
   - Reuse existing `filters.vehicleId` if search is vehicle-only, or add `filters.search` if broader textual search is required.
   - Remove `searchKey` usage from `DataTable`.
6. Ensure changing any filter/search resets page to 1.
7. Keep table pagination controls bound to server pagination payload.

## Success Criteria
- Search on affected pages refetches server data.
- DataTable local column filtering is not used for server-paginated rows.
- Current page never shows fewer records due to a post-fetch filter while total/pages remain unchanged.

## Risk Assessment
- Reworking shared `DataTable` can regress non-server tables. Prefer page-level search inputs unless shared change is clearly smaller.

## Unresolved Questions
- Should search input be debounced? Keep simple unless current UX causes too many requests.
