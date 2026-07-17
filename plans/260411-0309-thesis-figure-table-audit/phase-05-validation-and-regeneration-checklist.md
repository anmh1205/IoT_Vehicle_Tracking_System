# Context links
- Inventory baseline: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/phase-01-thesis-source-and-asset-inventory.md`
- Normalization rules: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/phase-02-numbering-and-caption-normalization.md`
- Audit baseline: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/phase-03-duplicate-orphan-and-mapping-audit.md`
- Rename/rewire sequence: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/phase-04-safe-rename-and-latex-rewire-plan.md`
- Canonical source: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`

# Overview
- Priority: P2
- Current status: pending
- Brief description: Define the validation gates for numbering cleanup, full asset taxonomy remap, standard LaTeX float/label/ref migration, render regeneration, and final document integrity before any cleanup is accepted.

<!-- Updated: Validation Session 1 - add float/label/ref validation gates -->

# Key Insights
- A clean compile is necessary but not sufficient; this thesis problem is mostly semantic and mapping integrity.
- Validation must compare body captions, LoF/LoT, asset outputs, and mapping ledger together.
- Mermaid regeneration is a dependency gate, not a nice-to-have.
- Deletion/cleanup should happen only after evidence shows no drift.

# Requirements
- Functional requirements:
  - Define compile/regeneration checklist.
  - Define mapping integrity checks for figures and tables.
  - Define float/caption/label/ref integrity checks, including duplicate-label and unresolved-reference detection.
  - Define generated LoF/LoT integrity checks after macro-to-float migration.
  - Define visual/manual review points for Ch3 vs Ch4 semantic separation.
  - Define acceptance gates before deleting superseded assets.
- Non-functional requirements:
  - Keep checklist short, deterministic, and evidence-based.
  - Support batch validation after each rename group.
  - Avoid manual review overload by focusing on known high-risk ranges first.

# Architecture
- Gate 1: source integrity — mapping ledger, label ledger, rename manifest, protected-scope list.
- Gate 2: render integrity — Mermaid/source regeneration produces expected outputs.
- Gate 3: TeX integrity — compile succeeds, include paths resolve, and no duplicate labels or unresolved refs remain after reruns.
- Gate 4: document integrity — body captions, generated LoF/LoT, numbering grammar, and semantic separation pass review.
- Gate 5: cleanup integrity — only validated superseded assets are candidates for deletion.

# Related code files
- Files to modify:
  - None in this phase; planning only.
- Files to create:
  - Validation checklist sheet.
  - Batch evidence log.
  - Post-regeneration comparison report.
- Files to delete:
  - None during planning.

# Implementation Steps
1. Define mandatory evidence captured before and after each rename batch.
2. Define regeneration commands/checks for Mermaid and figure outputs.
3. Define TeX compile checks, rerun rules, and missing-file detection checks.
4. Define label/ref audit checks: duplicate labels, unresolved references, and label ledger conformance.
5. Define caption audit checks: body vs generated LoF/LoT vs mapping ledger.
6. Define numbering audit checks for suffix-only sibling variants and post-migration float numbering continuity.
7. Define semantic review checks for Ch3 solution vs Ch4 implementation/results.
8. Define acceptance threshold for deleting superseded files.
9. Define final sign-off package: manifests, diff summary, unresolved anomalies.

# Todo list
- [ ] Define pre-batch evidence set
- [ ] Define render regeneration gate
- [ ] Define TeX compile + rerun gate
- [ ] Define label/ref integrity gate
- [ ] Define body/generated-LoF/generated-LoT comparison gate
- [ ] Define numbering continuity gate
- [ ] Define semantic duplicate review gate
- [ ] Define cleanup acceptance gate
- [ ] Define final sign-off artifact list

# Success Criteria
- Each future batch has a deterministic pass/fail checklist.
- Known high-risk ranges in Ch4 are explicitly validated.
- Duplicate labels or unresolved references cannot pass unnoticed.
- Generated LoF/LoT drift cannot pass unnoticed.
- No asset cleanup is accepted without regeneration and document-integrity evidence.

# Risk Assessment
- Risk: Compile passes while numbering semantics remain wrong.
  - Mitigation: require ledger/body/list comparison, not compile-only approval.
- Risk: Manual reviewers miss duplicate semantics in large chapters.
  - Mitigation: focus review by semantic domain and intent class.
- Risk: Regeneration outputs silently differ from expected mapping.
  - Mitigation: require manifest and filename diff against the approved ledger.
- Risk: A partial migration leaves hidden duplicate labels or unresolved refs after the first compile.
  - Mitigation: require rerun-based TeX validation plus duplicate-label and unresolved-reference checks.

# Security Considerations
- Keep validation artifacts inside the active plan area when generated later.
- Do not delete or overwrite originals until acceptance gates pass.
- Preserve audit trace for all file lifecycle decisions.

# Next steps
- Use this checklist as the exit criteria for any future implementation pass.
- Feed any failed gate back to the relevant earlier phase instead of patching ad hoc.
- Unresolved questions:
  - Which exact render and TeX commands are canonical in this repo for thesis regeneration?
  - Is there a reviewer-approved baseline PDF/output to diff against after remap work?
