---
type: pattern
repo:
  - iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
knowledge_state: validated
confidence: medium
source_refs:
  - ../10-repo-packs/iot-vehicle-tracking-system/50-decisions/decision-thesis-as-design-anchor-not-current-truth.md
  - ../10-repo-packs/iot-vehicle-tracking-system/70-sources/conflict-queue.yaml
review_due: 2026-05-24
owner_scope: personal
---
# Pattern: Thesis Intent Must Be Checked Against Repo Truth First

## Problem
Thesis files are rich and coherent, but they freeze a system at one point in time.

## Pattern
Use the thesis for intent, rationale, and historical architecture. Before promoting any operational claim, check current code, compose, env, and runtime contracts.

## Evidence In This Repo
- Local port allocation drift
- Host-port exposure drift
- Frontend stack-version drift
- Env-contract drift

## Anti-Pattern
Copy thesis appendix values into runbooks without checking current compose and package manifests.

