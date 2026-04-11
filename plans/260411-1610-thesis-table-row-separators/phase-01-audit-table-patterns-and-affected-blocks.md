# Phase 01 - Audit table patterns and affected blocks

## Context Links
- Parent plan: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-1610-thesis-table-row-separators/plan.md`
- Source: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- Docs: `E:/anmh1205/IoT_Vehicle_Tracking_System/docs/code-standards.md`

## Overview
- Date: 2026-04-11
- Description: Identify exactly which table patterns still miss row separators.
- Priority: P2
- Implementation status: pending
- Review status: pending

## Key Insights
- Thesis already has bordered `tabular` and many bordered `longtable` blocks.
- Abbreviation `longtable` near line ~723 has no visible row separators by design or omission; needs explicit decision.
- Existing macro redefinitions near lines ~97-98 may already affect `longtable` row endings. Avoid broad changes until audited.

## Requirements
- Functional: list affected tables and missing-separator pattern per table.
- Non-functional: no style regression, no unnecessary refactor.

## Architecture
- Search by environment: `tabular`, `longtable`, `tabularx`.
- Classify by border style: pipe-based columns, explicit `\hline`, `booktabs` (`\toprule`, `\midrule`, `\bottomrule`), macro-driven row rules.
- Mark only tables where row separators are expected by current thesis style.

## Related Code Files
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- Create: none
- Delete: none

## Implementation Steps
1. Grep all table environments and rule commands.
2. Read each candidate block, especially tables without `|` in column spec or without per-row `\hline`/rule commands.
3. Separate intentional `booktabs` tables from broken grid tables.
4. Produce a short hit list: line range, environment, current rule style, safest fix.

## Todo List
- [ ] Inventory all table environments
- [ ] Flag tables with missing row dividers
- [ ] Confirm whether abbreviation table should match grid style
- [ ] Record minimal fix per table

## Success Criteria
- Every affected table is identified before edits.
- No false positives on intentional `booktabs` layout.

## Risk Assessment
- Risk: adding lines to tables meant to stay open.
- Mitigation: classify by existing style around same chapter/table family.

## Security Considerations
- None beyond source integrity.

## Next Steps
- Hand exact edit list to phase 02.
