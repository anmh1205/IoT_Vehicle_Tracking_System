---
title: "Thesis defense rehearsal workflow"
description: "Add an appendix-level multi-agent rehearsal loop to the final thesis LaTeX report without changing the main thesis structure."
status: pending
priority: P2
effort: 2h
branch: feature/cicd
tags: [thesis, latex, appendix, multi-agent, defense]
created: 2026-04-12
---

# Goal
Add a practical rehearsal appendix to `resources/reports/thesis/final/thesis-final-report.tex` that simulates a defense with three roles:
- review committee / opponent
- tech researcher
- presenter / answerer

# Todo
1. Find the best appendix insertion point and reuse the existing thesis appendix style.
2. Draft a compact workflow section with role responsibilities, question rules, rebuttal flow, and refinement loop.
3. Add practical artifacts: sample question rounds, rebuttal guidance, and a presentation-quality checklist.
4. Keep the change appendix-level unless a small cross-reference is needed in the main body.
5. Recompile the thesis PDF and check for numbering, layout, and appendix regressions.

# Constraints
- Minimum 3 roles.
- The committee role must ask hard questions and challenge weak claims.
- The researcher role must ground answers in the thesis tech stack and evidence.
- The presenter role must defend, clarify, and rewrite weak explanations into better thesis language.
- Keep the content short enough to be used during a real rehearsal session.

# Acceptance
- The thesis file contains a standalone rehearsal appendix section.
- The workflow supports question -> rebuttal -> refinement, not just a static checklist.
- No unnecessary packages, macros, or structural rewrites.

