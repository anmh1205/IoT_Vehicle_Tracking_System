---
title: "Kế hoạch nghiên cứu đa nguồn và biên soạn firmware programming docs"
description: "Plan theo pha để tạo bộ tài liệu programming có citation chặt, cross-validation, và quality gates."
status: pending
priority: P2
effort: 18h
branch: feature/cicd
tags: [firmware, research, documentation, esp32-s3, sim7600, lis3dsh, lis3dh, traceability]
created: 2026-04-04
---

# Overview
- Mục tiêu: tạo bộ tài liệu `hardware-specs/programming` cho firmware programming, dựa trên vendor + repo/community + forum, không sửa runtime code.
- Phạm vi linh kiện: ESP32-S3, SIM7600/SIM7600CE, LIS3DSH/LIS3DH distinction, W25Q128JV, DS3231M, power IC.
- Rule chính: claim quan trọng phải có evidence/link; claim thiếu evidence phải đánh dấu provisional.
- Đầu ra đích: overview, per-component guides, integration patterns, failure/debug playbook, citation index, glossary.

## Phase tracker
| Phase | Trạng thái | Tiến độ | File |
|---|---|---:|---|
| 01. Scope + source governance | pending | 0% | [phase-01-scope-and-source-governance.md](./phase-01-scope-and-source-governance.md) |
| 02. Evidence collection + normalization | pending | 0% | [phase-02-evidence-collection-and-normalization.md](./phase-02-evidence-collection-and-normalization.md) |
| 03. Cross-validation matrix + confidence | pending | 0% | [phase-03-cross-validation-matrix-and-confidence.md](./phase-03-cross-validation-matrix-and-confidence.md) |
| 04. Information architecture docs | pending | 0% | [phase-04-document-information-architecture.md](./phase-04-document-information-architecture.md) |
| 05. Authoring per-component guides | pending | 0% | [phase-05-component-programming-guides-authoring.md](./phase-05-component-programming-guides-authoring.md) |
| 06. Integration + debug playbook | pending | 0% | [phase-06-integration-failure-debug-playbook.md](./phase-06-integration-failure-debug-playbook.md) |
| 07. Quality gates + publish readiness | pending | 0% | [phase-07-quality-gates-review-and-publish-readiness.md](./phase-07-quality-gates-review-and-publish-readiness.md) |

## Dependency chain
- P01 -> P02 -> P03 -> P04 -> P05 -> P06 -> P07.
- P03 là gate cứng trước khi đi sâu nội dung P05/P06.

## Quality gates (global)
- Correctness: claim khớp vendor facts, không sai SKU/variant.
- Consistency: thuật ngữ, naming, state semantics nhất quán toàn bộ docs.
- Traceability: mỗi claim quan trọng map được tới source + evidence id.
- Confidence: phân loại A/B/C cho từng claim và rationale.
- Unresolved questions: theo dõi tập trung, không ẩn trong prose.

## Out-of-scope
- Không thay đổi runtime code, CI/CD, firmware state machine.
- Không tạo markdown ngoài plan dir hiện tại và docs target đã định nghĩa trong plan.

## Validation Log

### Session 1 — 2026-04-04
**Trigger:** Initial plan validation after plan creation.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Khi vendor docs mâu thuẫn với community/forum pattern, bạn muốn áp quy tắc quyết định nào?
   - Options: Vendor-first (Khuyến nghị) | Weighted hybrid | Field-first
   - **Answer:** Vendor-first (Khuyến nghị)
   - **Rationale:** Khóa precedence rõ giúp giảm tranh cãi khi evidence mâu thuẫn và tránh anecdotal override constraints cứng từ vendor.

2. **[Assumptions]** Mức evidence tối thiểu để một claim critical được phép vào bản publish là gì?
   - Options: Vendor + 1 field (Khuyến nghị) | Vendor-only đủ | Any two sources
   - **Answer:** Vendor + 1 field (Khuyến nghị)
   - **Rationale:** Giữ đồng thời correctness (vendor) và applicability thực địa (field), giảm rủi ro tài liệu đúng lý thuyết nhưng yếu tính vận hành.

3. **[Risks]** Với claim còn mơ hồ về SKU/manual version (SIM7600 variants, LIS3DH vs LIS3DSH), xử lý publish thế nào?
   - Options: Giữ nhưng gắn C + warning (Khuyến nghị) | Tạm loại khỏi publish | Giữ như note phụ
   - **Answer:** Giữ nhưng gắn C + warning (Khuyến nghị)
   - **Rationale:** Giữ tri thức có ích nhưng buộc minh bạch mức bất định và điều kiện áp dụng.

4. **[Scope]** Trong playbook debug, bạn muốn mức độ checklist xác minh thực địa nào?
   - Options: Chuẩn production (Khuyến nghị) | Mức vừa | Cơ bản
   - **Answer:** Chuẩn production (Khuyến nghị)
   - **Rationale:** Mục tiêu tài liệu là dùng được thực địa, cần instrument checks + pass/fail criteria rõ.

#### Confirmed Decisions
- Conflict precedence: Vendor-first.
- Critical claim publish floor: Vendor + 1 field evidence.
- Variant-uncertain claim policy: Publish với confidence C + warning.
- Debug playbook depth: Production-grade checklist.

#### Action Items
- [ ] Cập nhật policy precedence trong P01/P03 theo Vendor-first.
- [ ] Cập nhật quality gate “minimum proof floor” trong P03/P07.
- [ ] Cập nhật quy tắc variant-uncertain claim trong P03/P05/P07.
- [ ] Cập nhật debug playbook depth chuẩn production trong P06.

#### Impact on Phases
- Phase 01: Bổ sung governance rule Vendor-first và minimum proof floor cho claim critical.
- Phase 03: Bổ sung gating rule “Vendor + 1 field” và policy confidence C + warning cho claim variant-uncertain.
- Phase 05: Bổ sung mandatory warning label cho claim confidence C trong component guides.
- Phase 06: Nâng debug playbook lên production-grade checklist có instrument checks + pass/fail criteria.
- Phase 07: Bổ sung publish gate kiểm tra proof floor, confidence-C warnings, và độ đầy đủ production checklist.