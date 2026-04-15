---
title: "Thesis multi-agent review session"
description: "Run a structured LaTeX thesis review loop with committee, tech researcher, and respondent roles; store the full dialogue in one Markdown log under resources/."
status: pending
priority: P2
effort: 2h
created: 2026-04-12
tags: [thesis, latex, multi-agent, review, documentation]
---

# Goal
Create a pragmatic multi-agent thesis review session around `resources/reports/thesis/final/thesis-final-report.tex`.

# Scope
- Role 1: review committee, asks hard questions and challenges weak claims.
- Role 2: tech researcher, verifies technical correctness and evidence.
- Role 3: respondent, answers, defends, and rewrites unclear explanations.
- Output: one full conversation log in a single Markdown file under `resources/`.
- End section: summary of issues, fixes, and improvements for the user.

# Todo
1. Inspect the thesis LaTeX source and identify the strongest section(s) for review.
2. Define a structured multi-round prompt flow for the three roles.
3. Draft the full conversation log with questions, rebuttals, clarifications, and follow-up challenges.
4. Add a closing summary that lists issues, concrete fixes, and presentation improvements.
5. Save the final log as one Markdown file under `resources/` using a clear, stable name.

# Verification
- Log exists as a single `.md` file under `resources/`.
- The log includes all three roles and multiple question/answer/rebuttal turns.
- The final section ends with actionable issues, fixes, and improvements.
- Content stays focused on thesis review quality, not generic filler.

