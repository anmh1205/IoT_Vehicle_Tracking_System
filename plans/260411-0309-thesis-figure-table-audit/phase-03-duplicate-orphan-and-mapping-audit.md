# Context links
- Inventory baseline: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/phase-01-thesis-source-and-asset-inventory.md`
- Normalization rules: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/phase-02-numbering-and-caption-normalization.md`
- Research: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/research/researcher-02-duplicate-risk-audit.md`
- Canonical source: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- Asset root: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/`

# Overview
- Priority: P1
- Current status: pending
- Brief description: Audit semantic duplicates, orphan/support assets, and caption-to-asset mapping gaps, with special focus on Ch3 vs Ch4 drift and Mermaid render dependencies.

# Key Insights
- The dangerous duplicate is semantic duplicate, not exact filename duplicate.
- Ch3 solution assets and Ch4 implementation/result assets can describe nearly the same flow with different wording.
- Orphan judgment is unsafe until source files, scripts, configs, and final outputs are linked.
- Confirmed Ch4 numbering shifts mean mapping errors are already systemic, not isolated.

# Requirements
- Functional requirements:
  - Audit semantic overlap between Ch3 and Ch4 captions/assets.
  - Audit orphan candidates across figures, UML sources, template PDFs, schematic/raw inputs, and netlists.
  - Audit mapping integrity for confirmed shifted ranges in Ch4.
  - Produce a triage list: keep, merge/reword, remap, protected dependency, or unknown.
- Non-functional requirements:
  - No deletion or rename during audit.
  - Evidence-first classification; unknown stays unknown.
  - Keep output reviewable by thesis editor and technical maintainer.

# Architecture
- Duplicate audit axis:
  - Semantic domain: hardware, firmware, backend/cloud, frontend/UI, deployment, results.
  - Intent class: design, implementation, observation, metric, screenshot.
- Orphan audit axis:
  - Final output, source artifact, build dependency, auxiliary reference, or unknown.
- Mapping audit axis:
  - Caption number -> caption text -> source asset -> rendered asset -> TeX usage.

# Related code files
- Files to modify:
  - None in this phase; planning only.
- Files to create:
  - Duplicate semantic matrix.
  - Orphan/protected-dependency register.
  - Ch4 shifted mapping register.
- Files to delete:
  - None.

# Implementation Steps
1. Group all captions and assets by semantic domain and intent class.
2. Compare Ch3 and Ch4 items within each domain to find probable duplicate semantics.
3. Review Ch4 cloud range `4.18..4.28` against asset names `4.15..4.25`.
4. Review Ch4 results range `4.29..4.47` against asset names `4.20..4.38`.
5. Classify assets that are not final figures into source, dependency, auxiliary, or unknown.
6. Mark template PDFs, schematic PDFs, and `.NET` files as protected until dependency use is disproven.
7. Produce a triage sheet for later rename/rewire planning.

# Todo list
- [ ] Build semantic domain matrix for Ch3 and Ch4
- [ ] Flag probable duplicate-meaning captions
- [ ] Audit Ch4 cloud shifted mapping range
- [ ] Audit Ch4 results shifted mapping range
- [ ] Classify non-final assets by dependency role
- [ ] Produce orphan/protected-dependency register
- [ ] Produce remap candidates for Phase 04

# Success Criteria
- Duplicate semantic risks are listed with evidence and intent-class rationale.
- Orphan candidates are separated from protected dependencies.
- Ch4 shifted mapping ranges are explicit and bounded.
- Phase 04 can plan renames without guessing what is safe to touch.

# Risk Assessment
- Risk: Semantic duplicate judgments can be subjective.
  - Mitigation: use domain + intent-class matrix, not wording alone.
- Risk: False orphan classification can break build or evidence appendix assets.
  - Mitigation: protect ambiguous files until script/path proof exists.
- Risk: Mapping drift may span more chapters than confirmed ranges.
  - Mitigation: audit all chapters, but prioritize confirmed Ch4 mismatches first.

# Security Considerations
- Stay read-only.
- Do not run destructive cleanup or rename commands.
- Treat generated assets and source diagrams as integrity-sensitive build inputs.

# Next steps
- Feed triage output into Phase 04 safe rename and LaTeX rewiring sequence.
- Feed duplicate/remap risks into Phase 05 validation checklist.
- Unresolved questions:
  - Do any Mermaid scripts hardcode current filename prefixes or chapter-number ranges?
  - Are template PDFs and raw schematic artifacts referenced by a final packaging flow outside the main `.tex` compile?
