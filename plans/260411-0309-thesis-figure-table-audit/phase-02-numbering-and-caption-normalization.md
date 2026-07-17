# Context links
- Inventory baseline: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/phase-01-thesis-source-and-asset-inventory.md`
- Canonical source: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- Research: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-0309-thesis-figure-table-audit/research/researcher-01-naming-index-audit.md`
- Standards: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`
- Architecture context: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/system-architecture.md`

# Overview
- Priority: P1
- Current status: pending
- Brief description: Define the target numbering grammar and caption normalization rules for figures and tables, using `.tex` as canonical and planning migration to standard LaTeX figure/table floats with `\caption`, `\label`, and stable `\ref` flow.

<!-- Updated: Validation Session 1 - standard LaTeX migration approved -->

# Key Insights
- The current issue is not just ugly numbering; it breaks traceability between body, lists, and assets.
- Validation approved migration toward standard LaTeX float/label/ref flow, so numbering normalization must be designed to survive that migration rather than stabilize the macro-only state.
- Mixed patterns like `1.3.1A`, `3.2.2A..K`, `4.1.1A`, and unnumbered table titles need one explicit policy, not case-by-case fixes.
- Ch3 and Ch4 need semantic caption wording rules so solution vs implementation/result items do not collapse into near-duplicates.

<!-- Updated: Validation Session 1 - key insights aligned to approved migration scope -->

# Requirements
- Functional requirements:
  - Define one visible numbering grammar for figures.
  - Define one visible numbering grammar for tables.
  - Define treatment for suffix variants (`a`, `b`) vs standalone new items.
  - Define treatment for currently unnumbered named tables.
  - Define list regeneration rules so body captions and LoF/LoT cannot drift.
- Non-functional requirements:
  - Target one approved end state based on standard LaTeX floats while defining a rollback-safe migration path from the current macro-based structure.
  - Minimize renumber blast radius.
  - Make policy executable by a later implementation pass without interpretation gaps.
  - Avoid a long-lived hybrid state where manual macro captions and generated float captions can drift.

# Architecture
- Numbering policy layer:
  - Figures: `Hình X.Y` with optional suffix `A`, `B`, `C` only for true same-base sibling variants.
  - Tables: `Bảng X.Y` with optional suffix only for true sibling variants when formatting rules require visible differentiation.
- Float migration layer:
  - Target standard `figure`/`table` floats with `\caption{...}` and stable `\label{...}` keys.
  - Replace manual macro-owned numbering with float-owned numbering and `\ref`/`\autoref`-compatible references.
  - Define a deterministic label grammar before any rewiring so caption numbers do not leak into label names.
- Caption semantics layer:
  - Ch3 captions describe design/architecture/selection rationale.
  - Ch4 captions describe implementation artifact, measurement, deployment evidence, or observed result.
- List integrity layer:
  - LoF/LoT must be generated from canonical float captions and cross-checked against the audit ledger derived from canonical `.tex`, not maintained as detached prose.

# Related code files
- Files to modify:
  - None in this phase; planning only.
- Files to create:
  - Normalization rule sheet under the implementation pass.
  - Renumber decision log for exceptional cases.
- Files to delete:
  - None.

# Implementation Steps
1. Define target numbering grammar for figures and tables under standard LaTeX float numbering.
2. Categorize current anomalies into: suffix-variant, subsection-encoded, duplicate-reused number, and unnumbered title.
3. Convert each anomaly class into a deterministic normalization rule, preserving suffixes only for true sibling variants.
4. Define the migration target from `\thesisfigurecaption`/`\thesistabletitle` to `figure`/`table` + `\caption` + `\label` + `\ref` flow.
5. Define label naming grammar and cross-reference policy so references stay stable even if visible numbers shift.
6. Define caption wording guardrails to separate Ch3 design intent from Ch4 implementation/result evidence.
7. Define LoF/LoT regeneration policy from canonical float captions plus inventory cross-checks.
8. Mark any rule that requires stakeholder approval before execution, especially visible caption wording changes.
9. Produce an exception register for items that cannot be normalized mechanically.

# Todo list
- [ ] Freeze figure numbering grammar
- [ ] Freeze table numbering grammar
- [ ] Decide suffix usage policy for true sibling variants only
- [ ] Decide treatment for unnumbered named tables
- [ ] Define standard float/caption/label/ref migration target
- [ ] Define label naming and reference policy
- [ ] Define Ch3 vs Ch4 caption wording rules
- [ ] Define LoF/LoT regeneration source policy
- [ ] List exception cases requiring manual review

# Success Criteria
- Every current anomaly class maps to one planned normalization rule.
- No future implementer has to guess whether `A/B/C` is a sibling or a new item.
- The migration target from macro-owned captions to standard float/caption/label/ref flow is explicit.
- Label naming and cross-reference policy are stable enough to survive renumbering.
- LoF/LoT regeneration path is specified from canonical caption data.
- Ch3 and Ch4 captions can be reviewed for semantic duplication using explicit wording criteria.

# Risk Assessment
- Risk: Institutional formatting may require preserving some legacy forms.
  - Mitigation: keep an approval gate for visible numbering exceptions.
- Risk: Renumbering may cascade into list and cross-reference drift.
  - Mitigation: normalization rules must feed Phase 05 validation checks.
- Risk: Partial migration leaves a temporary hybrid state where macros, floats, and generated lists disagree.
  - Mitigation: define one approved end state plus explicit per-batch transition rules, make hybrid coexistence temporary only, and validate label/ref and LoF/LoT integrity in Phase 05.

# Security Considerations
- No secret handling.
- No script execution needed for this planning phase.
- Preserve source-of-truth discipline; do not let derivative markdown overwrite canonical `.tex` decisions.

# Next steps
- Feed normalized rules into Phase 03 mapping audit and duplicate audit.
- Feed approved numbering grammar into Phase 04 rename/rewire plan.
- Unresolved questions:
  - Must visible suffixes `A/B/C` remain uppercase by thesis formatting rule, or can they become lowercase variants?
  - Are unnumbered tables intentional narrative inserts or numbering defects to normalize?
