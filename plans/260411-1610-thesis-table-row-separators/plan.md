---
title: "Fix thesis table row separators"
description: "Audit thesis LaTeX tables and add missing horizontal row separators with minimal consistent edits."
status: pending
priority: P2
effort: 1.5h
branch: feature/cicd
tags: [docs, bugfix, latex]
created: 2026-04-11
---

# Fix thesis table row separators

## Overview
Goal: find thesis tables still missing horizontal row dividers and patch `thesis-final-report.tex` with smallest safe edits.

## Phases

| # | Phase | Status | Effort | Link |
|---|---|---|---|---|
| 1 | Audit table patterns and affected blocks | Pending | 45m | [phase-01](./phase-01-audit-table-patterns-and-affected-blocks.md) |
| 2 | Patch row separators and validate output | Pending | 45m | [phase-02-patch-row-separators-and-validate-output.md](./phase-02-patch-row-separators-and-validate-output.md) |

## Dependencies
- Canonical source: `E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/thesis/final/thesis-final-report.tex`
- Respect existing thesis macros for `longtable` newline handling.
- Avoid visual style drift between `tabular`, `longtable`, and any `booktabs`-style tables.

## Notes
- Inspect `tabular`, `longtable`, `tabularx`, `booktabs` patterns.
- Prefer local fixes inside affected tables over global macro changes unless one macro already governs the exact broken pattern.
- Validate by recompiling thesis PDF and checking 2-3 representative tables plus multipage longtables.
