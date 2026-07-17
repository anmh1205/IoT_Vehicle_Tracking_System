# Phase 04 — Validation and Review

## Context Links
- Frontend package: `iot-vehicle-tracking-system-cloud/Tracking_Frontend`
- Backend package: `iot-vehicle-tracking-system-cloud/Tracking_Backend`
- Docs: `docs/project-changelog.md`, `docs/system-architecture.md` if API contract changes are material.

## Overview
Priority: High  
Status: Planned  
Validate compile/runtime behavior after implementation.

## Requirements
- Backend and frontend must compile/typecheck.
- Relevant tests must run; do not ignore failures.
- Docker rerun after code changes per user memory.
- Code reviewer agent must review implementation.

## Validation Steps
1. Backend:
   - `npm run typecheck`
   - `npm run test` or targeted tests for touched domains.
   - `npm run build`
2. Frontend:
   - `npm run typecheck`
   - `npm run build`
3. Runtime smoke:
   <!-- Updated: Validation Session 1 - endpoint smoke coverage -->
   - Start/rerun Docker services affected by backend/frontend changes.
   - Verify alert source filter total/page count with known mixed dataset.
   - Verify search on alerts/violations/maintenance finds records outside page 1.
   - Verify new violations and maintenance stats endpoints return filtered dataset-level aggregates.
   - Verify stat cards update when filters change.
4. UI smoke:
   - Use browser/devtools for alerts, violations, maintenance, firmware assignment.
   - Check loading/empty states and page reset behavior.
5. Review:
   - Run code-reviewer agent after tests pass.
6. Docs:
   - Update changelog for bug fix.
   - Update API/docs only if new query params are externally documented.

## Success Criteria
- All validation commands pass or failures are documented with root cause and fix plan.
- Manual UI checks confirm no current-page-only search/filter/stat behavior remains in target pages.
- No unrelated working tree changes included.

## Unresolved Questions
- Which Docker compose profile is currently expected for local validation if services are already running?
