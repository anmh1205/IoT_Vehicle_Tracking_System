---
title: "Frontend map Google Maps benchmark audit"
description: "Detailed audit and redesign plan for operations/map using Google Maps layout principles without copying Google Maps UI."
status: pending
priority: P1
effort: 3-5d
branch: uat
tags: [frontend, map, uiux, audit, operations]
created: 2026-04-24
---

# Goal

Create a strict, implementation-ready audit roadmap for `dashboard/operations/map` so the map becomes map-first, compact, stateful, and scalable.

# Product problem

The current map UI has the right building blocks, but it still risks surface sprawl:
- left list panel
- floating map controls
- selected-device bottom overlay
- allowed-zone side panel
- geofence workspace
- mobile drawer

Without a hard layout contract, each new feature can consume more map area and weaken operator scanning speed.

# Target outcome

After this roadmap is executed, the operations map should behave like a disciplined map workspace:
- map is the primary canvas
- each mode has a clear active surface
- details are progressively disclosed
- important state is deep-linkable
- mobile and desktop use the same logic with different surfaces
- operators can move from browse -> inspect -> edit -> drill-down without confusion

# What to learn from Google Maps

Do not copy Google Maps visuals. Copy these operating principles:
1. Map-first surface budget
2. One primary panel at a time
3. Strong mode separation
4. Progressive disclosure
5. Stable control zones
6. Deep-linkable state
7. Mobile/desktop parity in logic

# Scope

## In scope
- `src/app/dashboard/map/page.tsx`
- `src/app/dashboard/operations/map/page.tsx`
- `src/features/map/components/tracking-map.tsx`
- `src/features/map/components/device-list-panel.tsx`
- `src/features/map/components/mobile-device-drawer.tsx`
- `src/features/map/components/map-controls.tsx`
- `src/features/map/components/map-selected-device-overlay.tsx`
- `src/features/map/components/map-allowed-zone-panel.tsx`
- `src/features/map/store/map-store.ts`
- duplicate/legacy map components under `src/components/map/*` and `src/features/map/components/*`

## Explicitly out of scope for this audit plan
- backend contract redesign
- geospatial engine rewrite
- changing map provider
- full visual rebrand across the whole dashboard

# Current baseline

## Strengths already present
- desktop already uses a left device panel
- mobile already uses a bottom sheet
- map controls are already grouped on the right side
- selected-device overlay already has quick actions
- allowed-zone flow already exists as a dedicated surface

## Core weaknesses to fix
- no enforced surface budget
- too many independent overlays can coexist
- map state is not URL-driven enough
- overlay density can grow again over time
- duplicate map component trees still exist
- large-list scaling and audit guardrails are not formalized

# Success criteria

1. On desktop, no more than one large auxiliary panel and one compact contextual surface may be open at the same time.
2. On mobile, no more than one major sheet/drawer may own focus at a time.
3. Selected-device overlay becomes a briefing layer, not a mini dashboard.
4. Edit modes clearly suppress or collapse browse surfaces.
5. URL can restore at least these states:
   - selected device
   - map center/zoom
   - map layer
   - follow mode
   - geofence visibility
   - active map submode/panel where appropriate
6. Duplicate map component paths are retired or explicitly marked dead.
7. Map remains readable on a 1366x768 viewport and a narrow mobile viewport.

# Deliverables

1. A benchmark report mapping Google Maps layout principles to this codebase.
2. A mode matrix for the operations map.
3. A surface-budget contract for desktop and mobile.
4. A target information hierarchy for browse/inspect/edit states.
5. A URL-state contract for map state.
6. A cleanup plan for duplicate map components.
7. A phase-by-phase implementation checklist.
8. A verification checklist using browser + screenshots + pass/fail criteria.

# Default V1 Planning Assumptions

These are the working assumptions for the first implementation pass unless explicitly revised later.

1. Use a `hard mode + soft modifier` model.
2. Desktop edit mode hides the left browse panel in v1 instead of introducing a collapsed rail.
3. Desktop inspect mode keeps the selected-device surface as a bottom briefing card in v1.
4. Allowed-zone visibility follows the currently selected vehicle. Switching vehicle switches zone context immediately.
5. Dirty geofence or allowed-zone edits require discard confirmation before switching vehicle or leaving edit mode.

# Surface Contract Summary

1. Desktop allows at most:
   - one major panel
   - one contextual surface
   - floating controls
2. Mobile allows at most:
   - one major sheet/card in focus
   - floating controls
3. `browse` and `inspect-device` are browsing states.
4. `edit-geofence` and `edit-allowed-zone` are mutually exclusive edit states.
5. `follow-selected-device`, `show-geofence-layer`, `show-allowed-zone-layer`, and `map-error-banner` are modifiers, not standalone major modes.

# Execution order

1. Benchmark and map shell audit
2. Surface budget and mode matrix
3. State and deep-link contract
4. Information density and visual rhythm audit
5. Performance, accessibility, and consistency audit
6. Target layout proposal
7. Incremental implementation and verification

# Phase mapping

1. `phase-01-benchmark-and-map-shell`
2. `phase-02-surface-budget-and-mode-matrix`
3. `phase-03-state-url-and-navigation-contract`
4. `phase-04-information-density-copy-and-visual-system`
5. `phase-05-performance-accessibility-and-consistency`
6. `phase-06-target-layout-and-component-boundaries`
7. `phase-07-rollout-verification-and-audit-closure`

# Acceptance gates by phase

## Gate A: Audit readiness
Must have:
- current map surfaces inventoried
- duplicate component trees identified
- benchmark notes from Google Maps captured

## Gate B: UX contract readiness
Must have:
- mode matrix approved
- surface budget approved
- target hierarchy approved
- v1 planning assumptions confirmed or revised

## Gate C: engineering readiness
Must have:
- URL-state contract defined
- ownership boundaries per component decided
- cleanup list for dead/legacy map components decided

## Gate D: rollout readiness
Must have:
- implementation order locked
- browser verification checklist locked
- screenshot review checklist locked

# Risks

## Risk 1: map keeps accumulating overlays
Mitigation:
- enforce a mode matrix before editing UI
- reject new surfaces that do not declare suppression rules

## Risk 2: visual cleanup without state cleanup
Mitigation:
- state contract must be designed before layout refactor
- URL/deep-link rules are phase 3, not optional

## Risk 3: mobile diverges from desktop
Mitigation:
- shared mode logic, different shells only
- avoid separate business logic for mobile drawer

## Risk 4: legacy component drift
Mitigation:
- audit all `src/components/map/*` vs `src/features/map/components/*`
- remove or freeze dead paths

## Risk 5: implementation becomes cosmetic only
Mitigation:
- every UI change must map to a stated operator problem
- every surface must justify its footprint

# Recommended implementation cadence

## Pass 1: architecture and contracts
- no styling first
- lock shell, modes, state, and ownership

## Pass 2: compactness and hierarchy
- reduce overlay density
- align action priority
- compress verbose surfaces

## Pass 3: refinement and regression audit
- browser verification
- screenshot review
- mobile + desktop parity check

# Verification strategy

## Functional
- select device
- switch to another device
- toggle follow mode
- show/hide geofences
- open allowed-zone panel
- open geofence workspace
- close edit mode and return to browse mode
- refresh page with URL state

## UX
- map remains readable with active surfaces
- controls do not overlap critical content
- selected state is always obvious
- edit state is always obvious
- empty state and loading state are visually clear

## Technical
- no duplicate source of truth for map state
- no dead components still imported by route entrypoints
- no unnecessary rerenders from oversized state ownership

# Notes for implementation

- Prefer deleting dead map code over keeping parallel systems.
- Keep browse and edit surfaces separate.
- Use the selected-device overlay as a quick decision layer only.
- Keep advanced settings collapsed by default.
- Treat URL state as part of product UX, not as a convenience.

# Unresolved questions

- Should geofence edit and allowed-zone edit be mutually exclusive at the route state level?
- Which map states should be shareable by URL versus local-only transient state?
- Should the selected-device overlay dock at bottom on desktop long-term, or eventually become a left-panel detail state?
