# Context Links
- Root plan: `./plan.md`
- Phase 01: `./phase-01-inventory-and-naming-freeze.md`
- Mermaid map script: `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
- Figure generator: `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`

# Overview
- Priority: P1
- Status: pending
- Brief: Quét toàn bộ dependency chạm filename và thiết kế manifest rename làm nguồn sự thật.

# Key Insights
- `thesis-mermaid-diagrams.mjs` map `.mmd -> .svg` theo basename, rename lệch 1 phía là gãy map.
- `generate-thesis-report-figures.mjs` đọc refs từ markdown rồi validate mapping, nên refs và map phải sync tuyệt đối.
- Cần matrix rõ “ref ở đâu / update bằng gì” để không sót `.tex`, `.md`, docs lệnh.

# Requirements
- Functional:
  - Lập dependency scan matrix đầy đủ touchpoints.
  - Thiết kế manifest schema có đủ dữ liệu để dry-run và rollback.
  - Định nghĩa method update theo từng touchpoint.
- Non-functional:
  - Manifest dễ review diff.
  - Không hardcode logic mới phức tạp.

# Architecture
<!-- Updated: Validation Session 1 - lock chapter-topic-id + canonical basename -->
- Nguồn sự thật: `rename-manifest` chứa `old_path`, `new_path`, `type`, `stage`, `ref_tokens`.
- Naming lock: figure/diagram bắt buộc theo `chapter-topic-id`; main tex basename cố định `thesis-final-report`.
- Update engine (thực thi sau): đọc manifest theo stage, apply rename + token replacement theo nhóm.
- Validation engine (thực thi sau): so đối chiếu tồn tại file và mapping coverage.

# Related Code Files
- Modify (kế hoạch):
  - `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs`
  - `resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs`
  - `resources/reports/thesis/final/*.md`
  - `resources/reports/thesis/final/*.tex`
  - `docs/**/*.md` (nếu có path/command cứng)
- Create (kế hoạch):
  - `resources/reports/thesis/final/assets/rename-manifest.json`
  - `resources/reports/thesis/final/assets/rename-manifest-dryrun-report.md`
- Delete (kế hoạch): none

# Implementation Steps
1. Quét refs path trong `.md`, `.tex`, script `.mjs`, docs liên quan.
2. Lập matrix touchpoint + method update.
3. Thiết kế schema manifest theo stage (`inventory`, `rename`, `refs`, `validate`).
4. Tạo mapping token replacement cho nội dung refs.
5. Chốt execution order từ manifest để phase 3 dry-run.

# Todo List
- [ ] Complete dependency matrix.
- [ ] Finalize manifest schema.
- [ ] Define update method per touchpoint.
- [ ] Define stage order and ownership.

# Success Criteria
- Mọi touchpoint có owner và update method.
- Manifest schema đủ để dry-run conflict check và rollback lookup.
- Không còn “unknown reference location”.

# Risk Assessment
- Rủi ro bỏ sót refs trong docs/lệnh build.
- Mitigation: grep theo cả old prefix và `assets/figures/` pattern.

# Security Considerations
- Không chạy replace toàn repo mù.
- Giới hạn phạm vi thay đổi theo whitelist paths trong manifest.

# Next Steps
- Sang phase 3: chạy dry-run với manifest đã chốt.

## Dependency scan matrix
| Touchpoint | Ref sống ở đâu | Update method | Stop condition |
|---|---|---|---|
| Mermaid source -> output | `assets/thesis-mermaid-diagrams.mjs` | đồng bộ basename `.mmd`/`.svg` | còn key map cũ/thiếu key mới |
| Figure generation lookup | `assets/generate-thesis-report-figures.mjs` | update naming constants + regex assumptions nếu có | `Missing Mermaid mapping` > 0 |
| Markdown image refs | `resources/reports/thesis/final/*.md` | token replace theo manifest | còn ref tới filename cũ |
| LaTeX include refs | `resources/reports/thesis/final/*.tex` | token replace theo manifest | compile fail vì missing file |
| Figure assets | `assets/figures/*` | regenerate từ source, không rename thủ công | tồn tại orphan hình không được tham chiếu |
| Build commands/docs | docs/notes/scripts liên quan thesis build | cập nhật basename output command | output drift khác tex basename |
| Draft image refs | `image/**` + md refs | đổi theo policy draft | còn timestamp filename vô nghĩa |

## Manifest design (minimum fields)
| Field | Type | Purpose |
|---|---|---|
| `id` | string | định danh record |
| `old_path` | string | đường dẫn cũ |
| `new_path` | string | đường dẫn mới |
| `file_type` | enum | tex/md/mmd/svg/png/pdf/log/aux/tmp |
| `role` | enum | source/generated/template/artifact |
| `stage` | enum | s1/s2/s3/s4 |
| `replace_tokens` | array | list token cần thay trong refs |
| `notes` | string | ngoại lệ/template policy |
