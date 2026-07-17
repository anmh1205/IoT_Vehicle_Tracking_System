# Phase 02 - Patch row separators and validate output

## Context Links
- Parent plan: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-1610-thesis-table-row-separators/plan.md`
- Source: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- Prior work: `E:/anmh1205/IoT_Vehicle_Tracking_System/plans/260411-1610-thesis-table-row-separators/phase-01-audit-table-patterns-and-affected-blocks.md`

## Overview
- Date: 2026-04-11
- Description: Apply smallest consistent LaTeX edits and confirm rendered separators.
- Priority: P2
- Implementation status: pending
- Review status: pending

## Key Insights
- Most bordered longtables already use `\hline` in header and row endings like `\\\hline`.
- Safe default: patch affected row endings locally, not package-wide.
- Global macro tweaks are last resort because they can double-rule existing tables or break page-head/foot behavior.

## Requirements
- Functional: all intended rows render horizontal separators.
- Non-functional: keep captions, labels, pagination, spacing stable.

## Architecture
- For `tabular`/`tabularx`: add `\hline` after affected rows if table already uses boxed style.
- For `longtable`: prefer `\\\hline` per data row or existing helper macro already used in same table family.
- For `booktabs`: keep `\toprule/\midrule/\bottomrule`; do not mix with dense `\hline` unless table is already grid-style.

## Related Code Files
- Modify: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- Create: none
- Delete: none

## Implementation Steps
1. Edit only audited tables.
2. Mirror surrounding rule style within each table family.
3. Recompile thesis.
4. Check representative single-page and multi-page tables in PDF.
5. If one repeated broken pattern remains, consider a narrowly scoped macro helper, then revalidate all affected tables.

## Todo List
- [ ] Patch each audited table
- [ ] Rebuild PDF
- [ ] Verify row lines visually
- [ ] Check for doubled rules or overflow regressions

## Success Criteria
- Missing row separators appear in all targeted tables.
- No doubled horizontal rules.
- PDF builds without new table errors.

## Risk Assessment
- Risk: `longtable` page break headers/footers get extra rules.
- Mitigation: validate first/continued/last page behavior on multipage tables.

## Security Considerations
- None.

## Next Steps
- If accepted, execute edits directly from this phase checklist.
