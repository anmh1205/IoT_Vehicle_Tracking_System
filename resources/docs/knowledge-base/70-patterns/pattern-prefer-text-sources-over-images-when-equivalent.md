---
type: pattern
repo:
  - iot-vehicle-tracking-system
domain:
  - iot-fleet-tracking
knowledge_state: validated
confidence: medium
source_refs:
  - ../10-repo-packs/iot-vehicle-tracking-system/70-sources/thesis-asset-linkage.md
  - ../10-repo-packs/iot-vehicle-tracking-system/70-sources/source-registry.md
review_due: 2026-05-24
owner_scope: personal
---
# Pattern: Prefer Text Sources Over Images When Equivalent

## Problem
Rendered diagrams and screenshots are easy to over-interpret and hard to diff.

## Pattern
- Read `.toc`, `.md`, and `.tex` before figure outputs.
- Prefer `.mmd` source before `.svg` or `.png`.
- Use images only to support a claim already anchored in text.

## Evidence In This Repo
- Thesis assets map 1:1 from `assets/uml/*.mmd` to `assets/figures/*`.
- Text chapters already describe the same architecture, topic contract, and deployment flows needed for wave 1.

## Anti-Pattern
Promoting an image-only interpretation into a validated note when the matching text section already exists.

