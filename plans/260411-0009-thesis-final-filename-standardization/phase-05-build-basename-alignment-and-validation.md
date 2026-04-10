# Context Links
- Root plan: `./plan.md`
- Phase 04: `./phase-04-controlled-rename-and-reference-sync.md`
- Thesis scripts:
  - `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`

# Overview
- Priority: P1
- Status: completed
- Brief: Validation scoped PASS; basename build khớp canonical `.tex`.

# Key Insights
- Drift `thesis-build.*` vs canonical `.tex` làm khó trace artifact và rollback.
- Validation phải cover cả grep, figure generation, latex build, broken link/path.
- Nếu build pass nhưng còn old-prefix refs thì migration chưa done.

# Requirements
- Functional:
  - Build PDF/log/aux theo đúng basename canonical của `.tex` chính.
  - Chạy full validation checklist sau rename.
  - Chốt pass/fail rõ bằng checklist có bằng chứng.
- Non-functional:
  - Validation deterministic, có thể rerun.
  - Không chấp nhận “pass tạm” với warning critical.

# Architecture
- Basename policy:
  - canonical main tex: `{tex_basename}.tex`
  - output canonical: `{tex_basename}.pdf` + artifact `build-{tex_basename}.*` hoặc cùng basename nếu tool mặc định.
- Validation gates:
  1) Ref integrity
  2) Mermaid mapping + render
  3) LaTeX compile
  4) Link/path hygiene

# Related Code Files
- Modify (kế hoạch): build docs/commands, thesis scripts nếu cần alignment
- Create (kế hoạch): validation report
- Delete (kế hoạch): drift artifacts không canonical

# Implementation Steps
1. Chốt command build để output basename bám canonical `.tex` (explicit `-jobname` hoặc default nhất quán).
2. Chạy generator figures và xác nhận pass.
3. Build LaTeX theo command đã chốt.
4. Chạy grep checks cho old prefixes và dangling refs.
5. Chạy broken-link/path checks trên markdown + latex include paths.
6. Tổng hợp checklist pass/fail; fail thì quay lại phase 3/4.

# Todo List
- [x] Lock build command with canonical basename.
- [x] Run figure generation validation.
- [x] Run latex build validation.
- [x] Run grep + broken-link/path validation.
- [x] Produce final validation report.

# Success Criteria
- Output basename không drift khỏi canonical `.tex`.
- Không còn prefix bẩn trong refs active.
- Figure generation + latex build đều pass.
- Không dangling image/include path.

# Risk Assessment
- Rủi ro: command docs không update -> đội khác tiếp tục sinh `thesis-build.*`.
- Mitigation: update touchpoint docs/commands cùng đợt cutover.

# Security Considerations
- Không relevant secrets.
- Validation command chỉ đọc/biên dịch trong phạm vi thesis final.

# Next Steps
- Sang phase 6 để chốt rollback playbook + cutover decision.

## Validation checklist (must run)
| Check group | Check cụ thể | Pass condition |
|---|---|---|
| Grep checks | không còn refs `99-`, `thesis-99-`, `thesis-build` trái policy | 0 match (trừ exception explicit) |
| Figure generation | chạy `generate-thesis-report-figures.mjs` | không lỗi mapping/render |
| LaTeX build | build canonical `.tex` | exit code 0 + output đúng basename |
| Broken-link/path | kiểm tra image/include path trong `.md/.tex` | mọi path tồn tại |
| Artifact hygiene | kiểm tra artifacts legacy | không còn drift artifact active |

## Basename alignment rule (explicit)
<!-- Updated: Validation Session 1 - canonical basename + artifact policy -->
- Canonical `.tex` cố định: `thesis-final-report.tex`.
- Output bắt buộc: `thesis-final-report.pdf`.
- Không chấp nhận `thesis-build.pdf`.
- `.log/.aux/.tmp` là artifact untracked; chỉ giữ PDF final theo policy đã chốt.
- Generator script đã vá: bỏ `process.cwd()`, neo theo `import.meta.url`, chỉ quét canonical `thesis-final-report.md`.
