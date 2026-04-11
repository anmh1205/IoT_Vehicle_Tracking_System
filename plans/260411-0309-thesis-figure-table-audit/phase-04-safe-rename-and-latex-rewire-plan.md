# Context links
- Inventory baseline: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/phase-01-thesis-source-and-asset-inventory.md`
- Normalization rules: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/phase-02-numbering-and-caption-normalization.md`
- Audit baseline: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/phase-03-duplicate-orphan-and-mapping-audit.md`
- Canonical source: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- Asset root: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/`

# Overview
- Priority: P2
- Current status: pending
- Brief description: Define a rollback-safe sequence to standardize the full thesis asset taxonomy and migrate LaTeX references to standard float/caption/label/ref flow after mapping is proven, while protecting render scripts and reversible checkpoints.

<!-- Updated: Validation Session 1 - full taxonomy standardization approved -->

# Key Insights
- Rename safety depends on proof of mapping and script dependency, not on naming aesthetics.
- Current filenames encode chapter and figure numbers; bulk rename before remap proof is reckless.
- Rewiring `.tex` and render sources must happen from canonical mapping tables, not from ad hoc search/replace.
- A reversible, batched sequence beats one-shot cleanup.

# Requirements
- Functional requirements:
  - Define rename order across source diagrams, rendered figures, TeX include paths, and label/ref rewiring.
  - Define allowed rename scopes and protected scopes.
  - Define rollback checkpoints per batch.
  - Define how shifted Ch4 mappings are corrected without losing traceability.
  - Define the conversion order from manual thesis macros to standard float/caption/label/ref flow.
  - Define label naming rules and reference rewiring order so filename cleanup does not break document references.
- Non-functional requirements:
  - Standardize the approved full taxonomy without adding unnecessary extra rename churn outside the target convention.
  - Keep each batch reviewable and reversible.
  - Avoid changing caption semantics and asset basenames in the same batch unless necessary.
  - Avoid a fragile hybrid state where manual macro numbering and float numbering coexist without explicit guardrails.

<!-- Updated: Validation Session 1 - non-functional scope aligned to full taxonomy standardization -->

# Architecture
- Batch 1: remap ledger only; no rename.
- Batch 2: dependency-safe source rename if required (`.mmd` and related generated outputs together).
- Batch 3: convert approved figure/table blocks from manual thesis macros to standard `figure`/`table` + `\caption` + `\label`.
- Batch 4: rewire TeX include paths and `\ref` targets from the approved ledger, then verify float-owned numbering matches the approved mapping via validation.
- Batch 5: cleanup of superseded basenames only after successful regeneration/diff.
- Rollback model: keep pre-change mapping export, label ledger, and per-batch file manifest.

# Related code files
- Files to modify:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
  - Potentially thesis render scripts/config under `.../assets/` during implementation, if dependency audit proves required.
- Files to create:
  - Rename ledger.
  - Batch manifest and rollback checklist.
  - Reference diff report for each rename batch.
- Files to delete:
  - Only superseded assets after validated regeneration; not in planning phase.

# Implementation Steps
1. Freeze a rename ledger from Phase 03 triage: old source, old output, new basename, TeX target, label target, rationale.
2. Mark protected scopes: templates, raw schematic assets, unknown dependencies, and any unverified script inputs.
3. For each batch, update mapping and label records before touching files.
4. If source `.mmd` names must change, update script/config references in the same batch or do not rename.
5. Regenerate outputs before rewiring TeX when output filenames depend on source basenames.
6. Convert approved `.tex` blocks from `\thesisfigurecaption`/`\thesistabletitle` to standard `figure`/`table` + `\caption` + `\label` in controlled batches.
7. Update `.tex` include paths, labels, and `\ref` targets from the approved ledger only.
8. Rebuild generated LoF/LoT after each structural batch so numbering drift is detected early.
9. Defer deletion of superseded files until Phase 05 validation passes.

# Todo list
- [ ] Build rename ledger with old/new basenames
- [ ] Build label ledger with old/new reference targets
- [ ] Mark protected scopes and no-touch files
- [ ] Define batch boundaries and rollback checkpoints
- [ ] Define source-script-output sync rule
- [ ] Define macro-to-float migration order
- [ ] Define TeX path/label/ref rewiring order
- [ ] Define deletion holdback policy
- [ ] Prepare diff evidence requirements per batch

# Success Criteria
- Every proposed rename belongs to a reviewed batch with rollback.
- No file is renamed without a proven source/output/TeX mapping.
- No label or reference target is changed without a reviewed ledger entry.
- Protected dependencies are excluded from cleanup.
- TeX path/label/ref rewiring order is explicit enough to execute without guesswork.
- Macro-to-float migration order is explicit enough to avoid hybrid numbering drift.

# Risk Assessment
- Risk: Script/config hardcoding breaks render generation after rename.
  - Mitigation: pair dependency updates with source rename in one batch or skip rename.
- Risk: TeX references or labels point to stale files/targets during partial migration.
  - Mitigation: batch regeneration, float conversion, and TeX path/label/ref rewiring together, then validate immediately.
- Risk: Cleanup deletes fallback files still referenced indirectly.
  - Mitigation: hold deletion until post-regeneration validation and manifest diff are clean.
- Risk: Mixed macro and float blocks produce duplicate or drifting LoF/LoT entries.
  - Mitigation: define chapter/block migration boundaries explicitly and rebuild lists after each structural batch.

# Security Considerations
- Preserve file integrity with manifest-based changes.
- Avoid destructive cleanup before validation.
- Keep an auditable rename ledger so later reviewers can trace every change.

# Next steps
- Use this sequence as the execution contract for the future implementation pass.
- Hand batch validation needs to Phase 05.
- Unresolved questions:
  - What label prefix taxonomy is preferred for final floats (`fig:`, `tab:` plus chapter/domain segments)?
  - Should macro-to-float migration be batched by chapter, by semantic domain, or by asset/render dependency boundary?
