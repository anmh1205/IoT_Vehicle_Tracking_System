# Filter/Search/Stats/Pagination Fix Plan

## Goal
Fix dashboard tables/cards where client-side filtering/search/stat aggregation is applied after server pagination, causing wrong counts, pages, and missing records.

## Scope
- Alerts page: move `source` filter and search into server query flow.
- Violations page: move search to server and make stat cards dataset-level.
- Maintenance page: move search to server and make stat cards respect active filters.
- Firmware device assignment: make badges describe the same filtered dataset semantics as the table.

## Current Findings
- `alerts/page.tsx` includes `source` in React Query key, but not in `alertServices.getList()` params; source is filtered locally after page fetch.
- `DataTable` search is local TanStack column filtering, unsafe for server-paginated tables.
- Violations stats read from current `rows`, not server totals.
- Maintenance list uses filters, but status counts fetch global status counts.
- Firmware assignment already has `deviceInventoryQuery` for all devices and paged `policyDevicesQuery` for table rows.

## Phases
1. [Backend API filter support](phase-01-backend-api-filter-support.md) — add minimal query params needed by UI.
2. [Frontend server-driven table state](phase-02-frontend-server-driven-table-state.md) — replace local search/filter with query params.
3. [Dataset-level stats and badges](phase-03-dataset-level-stats-and-badges.md) — align card/badge totals with active filters.
4. [Validation and review](phase-04-validation-and-review.md) — typecheck/build/test, Docker rerun, code review, docs update if needed.

## Key Decisions
- Do not make `DataTable` globally server-aware unless needed; prefer adding optional controlled search props or moving search input into page toolbar.
- Use existing `getList({ page, limit })` total counts for stats where possible to avoid new endpoints.
- For alert `source`, prefer backend `source=device|ecu` if it matches product semantics. If UI source `obd/system` is content-derived, add backend query that mirrors existing `isObdMaintenanceAlert` logic with SQL predicates.

## Risks
- Alert UI source labels may not map cleanly to database `source` (`device|ecu`). Need verify before implementation.
- Search semantics differ by domain; keep each query narrow and indexed-friendly.
- Multiple existing uncommitted changes exist; implementation must avoid unrelated edits.

## Success Criteria
- Server pagination totals match active filters/search on alerts, violations, maintenance.
- Search no longer only scans current page for affected server-paginated pages.
- Stat cards/badges clearly represent filtered dataset, not current page, or wording explicitly says current page.
- Frontend and backend compile/typecheck pass.
- Docker rerun after code changes and status reported.

## Unresolved Questions
- None after validation session 1.

## Validation Log

### Session 1 — 2026-05-03
**Trigger:** Pre-implementation validation after initial plan creation.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Alert UI `source=obd/system` nên được server hiểu theo cách nào?
   - Options: OBD heuristic (Recommended) | DB source | Đổi label UI
   - **Answer:** OBD heuristic (Recommended)
   - **Rationale:** This preserves current product semantics while moving filtering before pagination. Backend must mirror the existing OBD detection intent instead of mapping to DB `source=device|ecu`.

2. **[Scope]** Search ở trang maintenance nên tìm trên phạm vi nào?
   - Options: Vehicle only (Recommended) | Vehicle + title | Broad text
   - **Answer:** Vehicle + title
   - **Rationale:** Implementation must support a slightly broader but still bounded search surface, avoiding noisy broad text matching while allowing maintenance title lookup.

3. **[Assumptions]** Firmware assignment badge nên biểu diễn tập dữ liệu nào?
   - Options: All filtered (Recommended) | Current page | Hide badges
   - **Answer:** All filtered (Recommended)
   - **Rationale:** Badges must align with the user's perception of the filtered device set, not the current paginated slice.

4. **[Architecture]** Cách làm stats cho violations/maintenance nên ưu tiên gì?
   - Options: Count queries (Recommended) | New stats endpoints | Current wording
   - **Answer:** New stats endpoints
   - **Rationale:** Dedicated aggregate endpoints make dataset-level stats explicit and avoid multiple count-only list requests as dashboard data grows.

#### Confirmed Decisions
- Alert source filter: use backend OBD heuristic — preserves current UI semantics before pagination.
- Maintenance search: match vehicle plus title — bounded search scope with useful UX.
- Firmware badges: count all filtered devices — not current page.
- Stats: add dedicated stats endpoints for violations and maintenance — clearer API contract.

#### Action Items
- [ ] Add backend alert filter param for OBD/system heuristic.
- [ ] Add maintenance search support for vehicle plus title.
- [ ] Add dedicated stats endpoints for violations and maintenance.
- [ ] Compute firmware assignment badges from all filtered devices.

#### Impact on Phases
- Phase 1: Requirements/architecture must specify OBD heuristic, maintenance vehicle+title search, and new stats endpoints.
- Phase 2: Frontend table state must call server-side OBD/source and maintenance search params.
- Phase 3: Stats implementation must use new stats endpoints; firmware badges must use all filtered devices.
- Phase 4: Validation must include endpoint smoke checks for new stats APIs.
