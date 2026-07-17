# Context Links
- Research 01: `./research/researcher-01-report.md`
- Research 02: `./research/researcher-02-report.md`
- Root plan: `./plan.md`
- Scope dir: `resources/reports/thesis/final/`

# Overview
- Priority: P1
- Status: pending
- Brief: Khóa phạm vi rename, chốt naming policy duy nhất, cấm đổi ad-hoc ngoài policy.

# Key Insights
- Prefix đang trộn (`99-*`, `thesis-*`, `thesis-build*`) là nguồn drift chính.
- Nếu policy không freeze sớm, manifest sẽ đổi liên tục và dry-run vô nghĩa.
- Template và artifact build phải tách policy ngay từ đầu để tránh rename sai loại file.

# Requirements
- Functional:
  - Lập inventory đầy đủ theo loại file và vai trò (source/output/template/artifact).
  - Chốt canonical naming rules + ban-list prefix.
  - Chốt canonical basename cho `.tex` chính làm chuẩn cho output build.
- Non-functional:
  - Rule đơn giản, đọc là hiểu, không phụ thuộc tool custom.
  - Không sửa nội dung nghiệp vụ trong phase này.

# Architecture
- Single-source policy:
  1) Naming rule table.
  2) Exception policy (template vs artifact).
  3) Basename policy cho LaTeX output.
- Policy được dùng lại nguyên vẹn cho phase 2-6 (DRY).

# Related Code Files
- Modify (kế hoạch):
  - `resources/reports/thesis/final/**/*` (filename-level, theo manifest)
  - `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`
- Create (kế hoạch):
  - `resources/reports/thesis/final/assets/rename-manifest.*` (temporary during execution)
- Delete (kế hoạch):
  - Legacy artifacts gây nhiễu validate (`thesis-build.*` không canonical)

# Implementation Steps
1. Quét inventory và phân nhóm: source docs, diagram source, rendered figures, template, build artifacts.
2. Chốt canonical basename cho thesis main `.tex` (1 tên duy nhất).
3. Chốt ban-list: `99-`, `thesis-99-`, `final-`, `new-`, `copy-`, `untitled`.
4. Chốt separator: chỉ `-`, lowercase, ASCII slug.
5. Chốt policy cho suffix chữ (`14a`) và sequence (`-01`, `-02`).
6. Đóng băng policy: mọi rename ngoài policy bị reject.

# Todo List
- [ ] Complete inventory by extension and role.
- [ ] Freeze canonical basename of main `.tex`.
- [ ] Freeze canonical naming + ban-list.
- [ ] Freeze exception policy.

# Success Criteria
- Có 1 policy table rõ ràng, không mâu thuẫn.
- Có 1 canonical `.tex` basename đã chốt.
- Tất cả bên liên quan xác nhận freeze trước khi sang phase 2.

# Risk Assessment
- Rủi ro: chốt policy mơ hồ -> phải redo manifest.
- Mitigation: ép rule thành bảng cụ thể + ví dụ before/after.

# Security Considerations
- Không liên quan secret.
- Tránh command rename wildcard phá ngoài phạm vi `thesis/final`.

# Next Steps
- Sang phase 2 để quét dependency và thiết kế rename manifest theo policy freeze.

## Canonical naming rule table
<!-- Updated: Validation Session 1 - lock canonical basename and chapter-topic-id policy -->
| Type | Canonical rule | Before | After |
|---|---|---|---|
| `.tex` | `thesis-final-report.tex` (fixed canonical) | `99-bao-cao-thesis-hoan-chinh-latex.tex` | `thesis-final-report.tex` |
| `.md` | `thesis-{scope}-report.md` | `99-bao-cao-thesis-hoan-chinh.md` | `thesis-final-report.md` |
| `.mmd` | `thesis-{chapter2d}-{topic}-diagram-{id}.mmd` (`chapter-topic-id`) | `thesis-99-bao-cao-thesis-hoan-chinh-04.mmd` | `thesis-14-final-diagram-04.mmd` |
| `.svg` | mirror basename từ `.mmd` | `thesis-99-bao-cao-thesis-hoan-chinh-04.svg` | `thesis-14-final-diagram-04.svg` |
| `.png` | mirror basename từ `.svg` | `1774979640345.png` | `draft-readability-01.png` |
| `.pdf` | output final theo canonical tex basename | `thesis-build.pdf` | `thesis-final-report.pdf` |
| `.log` | build artifact untracked | `thesis-build.log` | `thesis-final-report.log` |
| `.aux` | build artifact untracked | `thesis-build.aux` | `thesis-final-report.aux` |
| `.tmp` | build artifact untracked | `tmp1234.tmp` | `thesis-final-report-01.tmp` |

## Exception policy (freeze)
<!-- Updated: Validation Session 1 - no alias migration policy -->
- Template exceptions: giữ tên gốc vendor/template để truy vết (`*.docx/*.pdf/*.tex` gốc).
- Build artifacts: untracked mặc định; chỉ giữ PDF final cần bàn giao.
- Backward-compat: không giữ alias tên cũ (`99-*`, `thesis-build*`) sau cutover.
- Readability drafts: dồn `image/drafts/` hoặc folder draft rõ nghĩa; cấm prefix `99-*`.