---
type: decision
repo: iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
knowledge_state: validated
confidence: high
source_refs:
  - ../70-sources/source-registry.md
  - ../70-sources/reconciliation-summary.md
  - ../70-sources/conflict-queue.yaml
review_due: 2026-05-24
owner_scope: owned
---
# Decision: Thesis As Design Anchor, Not Current Truth

## Context
The thesis is the richest single design narrative in the repo, but the repo now has newer docs, newer package versions, new route behavior, and local bring-up drift.

## Decision
- Use thesis source files as the primary design and rationale anchor.
- Use current code, config, and runtime contracts as the authority for present behavior.
- When the two differ, keep the disagreement explicit in the conflict queue instead of silently merging them.

## Why
- This keeps intent and rationale available.
- This prevents historical docs from overwriting current runtime facts.
- This makes drift visible enough to fix.

## Concrete Examples From Wave 1
- Thesis appendix port mapping vs current frontend/Grafana mapping
- Thesis/README browser-access promises for EMQX and VictoriaMetrics vs current compose exposure
- Thesis frontend version baseline vs current `package.json`
- Thesis env contract shape vs current split host/port/TLS variables

## Consequences
- Official notes in this pack promote only `validated` and `current-only` claims.
- Historical or conflicting claims remain searchable but do not become operational defaults.

