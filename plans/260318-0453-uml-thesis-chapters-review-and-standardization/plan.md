---
title: "Rà soát & chuẩn hoá UML thesis"
description: "Khép kín quy trình rà soát UML .mmd để xử lý lỗi đè nhãn, chuẩn ngôn ngữ và xác nhận flow với chapter theo hướng YAGNI/KISS/DRY."
status: completed
priority: P2
effort: 18h
branch: feature/system-coding
tags: [uml, thesis, mermaid, render, qa]
created: 2026-03-18
---

## Mục tiêu
- Sửa lỗi mũi tên đâm xuyên nhãn/chỉ định hướng trong các UML Mermaid.
- Chuẩn hoá tiếng Việt có dấu trên nhãn, giữ nguyên thuật ngữ kỹ thuật.
- Rà logic/flow UML so với nội dung chapter.
- Chạy quy trình QA trước/sau render, có tiêu chí đóng gói rõ ràng.
- Không thêm tính năng mới, chỉ tối ưu đọc/độ chính xác nội dung.

## Progress
| Phase | Nội dung | Mức ưu tiên | Trạng thái |
|---|---|---|---|
| [Phase 1](./phase-01-scope-and-risk-triage.md) | Khảo sát nguồn UML + ma trận mapping chapter | Cao | Hoàn tất |
| [Phase 2](./phase-02-pre-render-standardization-gates.md) | Tiền kiểm chuẩn hoá cú pháp/label/edge | Cao | Hoàn tất |
| [Phase 3](./phase-03-language-and-flow-consistency.md) | Chuẩn hóa ngôn ngữ + khớp actor/luồng với thesis | Cao | Hoàn tất |
| [Phase 4](./phase-04-layout-and-arrow-label-corrections.md) | Sửa layout, đường chéo, label ngắn/đa dòng, tránh song song | Cao | Hoàn tất |
| [Phase 5](./phase-05-render-qa-closeout.md) | QA trước/sau render, chốt diff, bàn giao | Trung bình | Hoàn tất |

## Ghi chú triển khai
- Kết quả thực tế theo closeout:
  - Scope đã xử lý đủ 92 file UML `.mmd` theo mapping chapter.
  - Precheck trước/sau sửa đạt: `barInNodeLabelCount=0`, `duplicateEdgeCount=0`.
  - Render lại toàn bộ 92/92 file, không phát sinh lỗi runtime.
  - Đã chỉnh trực tiếp 2 file có vấn đề còn lại: `06-chuong-3-giai-phap-frontend-hinh-3-17.mmd`, `09-chuong-4-trien-khai-cloud-hinh-4-20.mmd`.

## Ghi chú vận hành
- Branch song song tối đa 2 nhánh khi thực thi: (A) chỉnh hình + quy tắc layout, (B) rà ngôn ngữ + flow logic.
- Đầu ra bắt buộc: file `.mmd` đã chuẩn hoá, SVG render lại, checklist QA pass, report tổng hợp.
- Thời điểm cập nhật: sau khi chỉnh hoàn tất trước khi merge vào `main`.

## Unresolved questions
- Không còn unresolved quan trọng sau Validation Session 1.

## Validation Log

### Session 1 — 2026-03-18
**Status:** Đã hoàn tất toàn bộ phase theo kế hoạch, không mở rộng scope ngoài YAML plan.

**Trigger:** Initial plan creation validation interview trước khi triển khai.
**Questions asked:** 3

#### Questions & Answers

1. **[Architecture]** Với các sơ đồ đang lỗi nặng overlay, mình có được phép đổi `flowchart direction` cục bộ (TD/LR) để giảm giao cắt nếu không đổi nội dung nghiệp vụ không?
   - Options: Cho phép cục bộ (Recommended) | Giữ nguyên direction | Chỉ P0/P1 được đổi
   - **Answer:** Cho phép cục bộ (Recommended)
   - **Rationale:** Mở quyền chỉnh direction theo file giúp xử lý nhanh cụm giao cắt nặng mà không phải ép sửa edge quá mức; vẫn bảo toàn semantics nếu giữ ràng buộc “không đổi nghiệp vụ”.

2. **[Scope]** Ngưỡng chuẩn hoá nhãn trên mũi tên nên chốt thế nào để đồng bộ toàn bộ UML?
   - Options: Max 24 ký tự (Recommended) | Max 30 ký tự | Theo từng loại sơ đồ
   - **Answer:** Max 24 ký tự (Recommended)
   - **Rationale:** Một ngưỡng cứng toàn bộ hệ giúp DRY, dễ tự động kiểm tra và giảm sai lệch giữa các chương.

3. **[Risk]** Bước QA hậu render nên áp dụng diff ảnh tự động ở mức nào?
   - Options: Bắt buộc cho P0/P1 (Recommended) | Áp dụng toàn bộ P0/P1/P2 | Không dùng diff ảnh
   - **Answer:** Áp dụng toàn bộ P0/P1/P2
   - **Rationale:** QA chặt cho toàn bộ phạm vi giảm rủi ro lọt lỗi P2 và tránh tranh luận chủ quan từ kiểm thủ công.

#### Confirmed Decisions
- `flowchart direction`: cho phép đổi cục bộ theo file — miễn không đổi semantics.
- `edge label length`: khóa ngưỡng tối đa 24 ký tự toàn bộ UML.
- `post-render QA`: bắt buộc image diff cho toàn bộ P0/P1/P2.

#### Action Items
- [x] Cập nhật Phase 02 để khóa ngưỡng label 24 ký tự như rule bắt buộc.
- [x] Cập nhật Phase 04 để cho phép đổi direction cục bộ theo nguyên tắc bảo toàn semantics.
- [x] Cập nhật Phase 05 để bắt buộc image diff cho toàn bộ wave P0/P1/P2.

#### Impact on Phases
- Phase 02: chuyển ngưỡng label 24 ký tự từ “gợi ý” thành “requirement bắt buộc”.
- Phase 04: bổ sung policy đổi direction cục bộ cho file lỗi overlay nặng.
- Phase 05: nâng chuẩn QA hậu render, bắt buộc image diff cho mọi mức ưu tiên.
