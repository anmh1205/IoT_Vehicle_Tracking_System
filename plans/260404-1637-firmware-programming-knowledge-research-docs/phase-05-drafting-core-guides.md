# Phase 05 — Drafting Core Guides

## Context links
- Parent plan: [plan.md](plan.md)
- IA spec: [phase-04-information-architecture-for-programming-docs.md](phase-04-information-architecture-for-programming-docs.md)
- Matrix design: [phase-03-cross-validation-matrix.md](phase-03-cross-validation-matrix.md)

## Overview
- Date: 2026-04-04
- Description: lập kế hoạch viết nội dung chi tiết cho core guides theo IA + matrix.
- Priority: P2
- Implementation status: pending
- Review status: pending

## Key Insights
- Drafting phải driven by matrix rows, không driven by intuition/code reading.
- Mỗi section quan trọng cần citation inline + confidence tag.

## Requirements
- Mỗi file core guide có:
  - objective
  - constraints
  - recommended pattern
  - anti-pattern
  - failure signals
  - validation checklist
  - citations
- Ngôn ngữ tiếng Việt, giữ thuật ngữ English thiết yếu.

## Architecture
- Draft pipeline per file:
  1) import claim rows
  2) map to section template
  3) embed citations/confidence
  4) peer consistency pass

## Related code files
- Modify: none (planning only)
- Create: drafting checklists/reports
- Reference-only:
  - `iot-vehicle-tracking-system-firmware/main/src/*.c`
  - `iot-vehicle-tracking-system-firmware/main/inc/*.h`

## Implementation Steps
1. Build chapter-level outlines from IA.
2. Assign claim groups into chapters.
3. Add anti-pattern and debug hooks per chapter.
4. Generate first-pass draft checklist.

## Todo list
- [ ] Build chapter outlines.
- [ ] Map claims to chapters without duplication.
- [ ] Add mandatory citation + confidence placeholders.

## Success Criteria
- 100% core guide chapters have actionable outline.
- No chapter lacks anti-pattern/debug subsection.
- No critical claim appears without planned citation anchor.

## Risk Assessment
- Risk: viết dài nhưng thiếu actionable detail.
  - Mitigation: enforce checklist-first, prose-second.
- Risk: overload technical terms.
  - Mitigation: strict glossary reference strategy.

## Security Considerations
- Cấm hướng dẫn thao tác có thể brick thiết bị nếu không có precondition checks.

## Next steps
- Move to Phase 06: quality gates + risk register formalization.
