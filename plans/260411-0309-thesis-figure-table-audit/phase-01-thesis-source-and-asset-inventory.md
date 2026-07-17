# Context links
- Canonical thesis source: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- Thesis asset root: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/assets/`
- Research: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/research/researcher-01-naming-index-audit.md`
- Research: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/research/researcher-02-duplicate-risk-audit.md`
- Project context: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/project-overview-pdr.md`
- Codebase context: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/codebase-summary.md`
- Standards: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`
- Architecture: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`

# Overview
- Priority: P1
- Current status: pending
- Brief description: Build a canonical inventory of thesis captions, macros, asset classes, render dependencies, and mapping gaps before any rename or numbering cleanup.

# Key Insights
- `.tex` must drive the audit; markdown is derivative and can hide drift.
- `\thesisfigurecaption` and `\thesistabletitle` mean numbering is manual-friendly but audit-hostile.
- Ch4 caption ranges already diverge from asset basenames, so raw filename inspection alone is not enough.
- Non-figure assets in `assets/` can be build dependencies, not safe-delete candidates.

# Requirements
- Functional requirements:
  - Inventory every figure caption, table title, and visible numbering pattern from `.tex`.
  - Inventory asset buckets: figures, uml sources, scripts, configs, templates, schematic/raw inputs.
  - Produce a caption-to-asset mapping sheet with states: exact, shifted, missing, unknown.
  - Identify render pipeline touchpoints that constrain renames.
- Non-functional requirements:
  - No thesis/assets modifications.
  - Use reproducible inventory output format.
  - Keep mapping readable enough for later implementation and review.

# Architecture
- Source of truth layer: `thesis-final-report.tex`.
- Extraction layer: captions, table titles, `\includegraphics`, macros, and any generated lists.
- Asset layer: `assets/figures`, `assets/uml`, scripts, config, templates, schematic inputs.
- Mapping layer: normalized record `{type, chapter, visible_number, caption_text, tex_location, asset_basename, source_file, status}`.
- Dependency layer: scripts/configs that produce or expect current filenames.

# Related code files
- Files to modify:
  - None in this phase; planning only.
- Files to create:
  - Inventory worksheet under the active plan implementation pass.
  - Caption-to-asset mapping worksheet under the active plan implementation pass.
- Files to delete:
  - None.

# Implementation Steps
1. Parse `.tex` for all `\thesisfigurecaption` and `\thesistabletitle` occurrences plus nearby `\includegraphics` and section context.
2. Enumerate assets by class: final figures, Mermaid sources, render scripts, config, templates, schematic/raw files.
3. Build an inventory table keyed by visible caption number, not by filename.
4. Mark mapping state per item: exact match, off-by-number shift, missing asset, or unknown source.
5. Isolate Ch4 cloud and Ch4 results ranges because confirmed shifts already exist.
6. Mark all non-final assets that may still be pipeline dependencies.
7. Freeze inventory output as baseline for later normalization and rename planning.

# Todo list
- [ ] Extract figure captions and line references from `.tex`
- [ ] Extract table titles and line references from `.tex`
- [ ] Enumerate `assets/figures` and `assets/uml`
- [ ] Enumerate render scripts/config/templates/raw schematic inputs
- [ ] Create caption-to-asset mapping status sheet
- [ ] Flag Ch4 shifted ranges separately
- [ ] Record dependency assumptions explicitly

# Success Criteria
- Every visible figure/table item has an inventory row.
- Every asset family is classified as final output, source, config/script, or supporting input.
- Ch4 shift ranges are documented with explicit start/end mismatch.
- Later phases can work from the inventory without rereading the whole tree manually.

# Risk Assessment
- Risk: Macro or manual spacing obscures local caption-to-image adjacency.
  - Mitigation: capture surrounding TeX context and do not infer mapping without evidence.
- Risk: Some outputs may live outside `assets/figures`.
  - Mitigation: classify as unknown instead of forcing a false match.
- Risk: Template and schematic files look orphaned but may be used indirectly.
  - Mitigation: keep a protected dependency bucket until pipeline behavior is verified.

# Security Considerations
- Keep scope read-only.
- Do not inspect secrets; thesis asset paths are non-secret.
- Do not execute unreviewed scripts in planning phase; only note dependencies.

# Next steps
- Hand inventory baseline to Phase 02 for numbering grammar design.
- Hand dependency list to Phase 04 for safe rename sequencing.
- Unresolved questions:
  - Are LoF/LoT fully manual blocks or partially generated from hidden macro flow?
  - Are any Ch4 outputs stored outside `assets/figures` or loaded from another directory?
