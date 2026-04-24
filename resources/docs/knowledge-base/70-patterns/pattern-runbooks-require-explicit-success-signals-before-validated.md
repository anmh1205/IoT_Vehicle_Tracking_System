---
type: pattern
repo:
  - iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
knowledge_state: validated
confidence: medium
source_refs:
  - ../10-repo-packs/iot-vehicle-tracking-system/40-runbooks/runbook-bring-up-local-stack.md
  - ../10-repo-packs/iot-vehicle-tracking-system/40-runbooks/runbook-validate-frontend-backend-health.md
  - ../10-repo-packs/iot-vehicle-tracking-system/70-sources/evidence-cards/thesis-ch06-evidence-cards.yaml
review_due: 2026-05-24
owner_scope: personal
---
# Pattern: Runbooks Require Explicit Success Signals Before `validated`

## Problem
Operational notes drift fastest when they stop at “run these commands” and never define what success looks like.

## Pattern
Every runbook should include:
- clear prerequisites
- ordered steps
- at least one concrete success signal
- known drift or blockers

## Evidence In This Repo
- Backend exposes explicit health surfaces.
- Bridge exposes health/readiness surfaces.
- Thesis lessons learned treat cross-layer testing as mandatory.

## Rule
If a runbook lacks a source-backed success signal, keep it `distilled`.

