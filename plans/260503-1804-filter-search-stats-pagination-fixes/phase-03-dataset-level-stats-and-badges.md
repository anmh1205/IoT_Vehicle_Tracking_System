# Phase 03 — Dataset-Level Stats and Badges

## Context Links
- Violations stats: `Tracking_Frontend/src/app/dashboard/violations/page.tsx`
- Maintenance stats: `Tracking_Frontend/src/app/dashboard/maintenance/page.tsx`
- Firmware page: `Tracking_Frontend/src/app/dashboard/firmware/page.tsx`
- Firmware assignment component: `Tracking_Frontend/src/app/dashboard/firmware/components/firmware-device-assignment.tsx`

## Overview
Priority: Medium  
Status: Planned  
Make cards/badges match dataset semantics: filtered dataset, not current visible page.

## Requirements
- Violations cards reflect all rows matching current filters/search.
- Maintenance cards respect active non-status filters and avoid global-only counts when user filters by vehicle/type/search.
- Firmware assignment badges represent all filtered policy devices, or labels explicitly say current page.

## Implementation Steps
1. Violations:
   <!-- Updated: Validation Session 1 - dedicated stats endpoints -->
   - Use a dedicated violations stats endpoint with the same active filters/search as the table.
   - Keep list pagination endpoint focused on rows and pagination.
2. Maintenance:
   <!-- Updated: Validation Session 1 - dedicated stats endpoints -->
   - Use a dedicated maintenance stats endpoint with the same active non-status filters/search as the table.
   - Query key must include active filters.
3. Firmware assignment:
   <!-- Updated: Validation Session 1 - all filtered badge semantics -->
   - Compute badge counts from all devices matching `policySearch`/`policyStatus`, not the current page.
   - Pass `summaryDevices` or `summaryCounts` into `FirmwareDeviceAssignment` separately from paginated `devices`.

## Success Criteria
- Cards/badges no longer silently show current page counts while wording suggests full dataset.
- Loading states include stats queries where needed.
- No broad new aggregation endpoints unless count-by-list-query becomes too costly.

## Risk Assessment
- Multiple count queries add network calls. Acceptable for small dashboard pages; revisit only if performance degrades.

## Unresolved Questions
- Firmware badge desired UX: all filtered devices vs current page wording?
