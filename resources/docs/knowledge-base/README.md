# IoT Knowledge Base Bootstrap

This subtree is the repo-local export of the wave-1 knowledge bootstrap for `IoT_Vehicle_Tracking_System`.

## Scope
- Bootstrap repo only: `IoT_Vehicle_Tracking_System`
- Design anchor: `resources/reports/thesis/final/thesis-final-report.tex`
- Fast structure helpers: `thesis-final-report.toc`, `thesis-final-report.md`
- Current-truth layers: `README.md`, `docs/`, `resources/docs/`, compose manifests, package manifests, env examples, and selected source contracts
- Mode: slow, provenance-first, conflict-preserving

## Source Precedence
1. Current code, config, and runtime contract in the repo
2. Current repo docs under `resources/docs/`, `docs/`, and `README.md`
3. Thesis source package: `.tex`, `.toc`, `.md`, and linked source assets
4. Rendered image/PDF outputs
5. Agent inference

## Output Layout
- `_system/`: schema, precedence, promotion rules
- `10-repo-packs/`: repo-specific promoted notes
- `20-domains/`: domain synthesis notes
- `70-patterns/`: reusable patterns promoted from evidence

## Current Limits
- This batch did not execute the full runtime stack live.
- Runbooks include explicit success signals, but remain `distilled` until a live pass closes them.
- Conflicts are intentionally preserved in `70-sources/conflict-queue.yaml` instead of being flattened into “one truth”.

## First Promoted Pack
- `10-repo-packs/iot-vehicle-tracking-system/`

