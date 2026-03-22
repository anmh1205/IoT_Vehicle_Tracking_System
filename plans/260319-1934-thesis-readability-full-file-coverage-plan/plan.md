---
title: "Rà soát readability thesis full-file"
description: "Khóa coverage readability theo cấu trúc resources mới, lấy `resources/reports/thesis/chapters/` làm source of truth và dùng `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md` làm assembled artifact để QA tính liền mạch."
status: execution-ready
priority: P1
branch: feature/system-coding
created: 2026-03-19
source_dir: resources/reports/thesis/chapters
validation_artifact: resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md
tags: [thesis, readability, markdown, planning, full-file, execution-ready]
---

## Mục tiêu
- Rà coverage đủ toàn bộ bộ source thesis trong `resources/reports/thesis/chapters/`, không bỏ sót file 00-14.
- Tăng độ dễ đọc cho người đọc không chuyên nhưng giữ lập luận, số liệu, trích dẫn, thuật ngữ cốt lõi.
- Ưu tiên Chương 3-4, nhưng vẫn bắt buộc phủ front matter, Chương 1-6, references, phụ lục.
- Dùng file final assembled để QA nhịp chuyển chương, consistency và asset/link integrity; không coi đây là nơi edit chính.

## Execution model
- Source of truth: `resources/reports/thesis/chapters/`.
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`.
- Mọi phase phải chỉ rõ chapter source files được phép chỉnh.
- Chỉ dùng final artifact để kiểm tra continuity toàn file, không bulk-edit trực tiếp trong `final/`.

## Progress
| Phase | Source files | Nội dung | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| [Phase 1](./phase-01-inventory-and-coverage-lock.md) | `00-14` | Khóa inventory, ownership, coverage theo source files | Cao | Done |
| [Phase 2](./phase-02-front-matter-and-navigation-pass.md) | `00-bia-va-phan-dau.md` | Front matter, abstract song ngữ, mục lục, danh mục, từ viết tắt | Trung bình | Ready |
| [Phase 3](./phase-03-chapters-01-02-context-and-requirements-pass.md) | `01`, `02` | Chương 1-2: bối cảnh, yêu cầu, bảng, ma trận | Cao | Ready |
| [Phase 4](./phase-04-chapter-03-decision-density-rewrite.md) | `03-06` | Chương 3: giảm mật độ quyết định/kỹ thuật | Rất cao | Ready |
| [Phase 5](./phase-05-chapter-04-implementation-narrative-rewrite.md) | `07-10` | Chương 4: narrative triển khai, evidence, đo lường | Rất cao | Ready |
| [Phase 6](./phase-06-chapters-05-06-evaluation-and-reflection-pass.md) | `11`, `12` | Chương 5-6: đánh giá, khuyến nghị, phản tư | Trung bình | Ready |
| [Phase 7](./phase-07-references-appendices-and-consistency-pass.md) | `13`, `14` + final QA | References, phụ lục, kết luận chương, consistency pass | Cao | Ready |

## Recommended execution order
1. `00-bia-va-phan-dau.md`
2. `01-chuong-1-gioi-thieu.md`
3. `02-chuong-2-phan-tich.md`
4. `03-chuong-3-giai-phap-phan-cung.md`
5. `04-chuong-3-giai-phap-firmware.md`
6. `05-chuong-3-giai-phap-backend.md`
7. `06-chuong-3-giai-phap-frontend.md`
8. `07-chuong-4-trien-khai-hardware.md`
9. `08-chuong-4-trien-khai-firmware.md`
10. `09-chuong-4-trien-khai-cloud.md`
11. `10-chuong-4-ket-qua-do-luong.md`
12. `11-chuong-5-danh-gia.md`
13. `12-chuong-6-phan-hoi.md`
14. `13-tai-lieu-trich-dan.md`
15. `14-phu-luc.md`
16. QA assembled artifact `final/99-bao-cao-thesis-hoan-chinh.md`

## File-by-file handoff rule
- Xong mỗi source file phải tự check 4 điểm trước khi qua file kế:
  1. Ý chính của từng section đã rõ hơn chưa.
  2. Bảng/code block lớn đã có intro/takeaway chưa.
  3. Thuật ngữ mới có được giải thích đủ chưa.
  4. Đoạn cuối file có nối mượt sang file/chương tiếp theo không.
- Chỉ sang file kế khi cả 4 điểm trên đều pass.

## Coverage lock
- `00-bia-va-phan-dau.md`: review forms, cover, lời cam đoan, abstract song ngữ, lời cảm ơn, mục lục, danh mục, từ viết tắt.
- `01-12`: nội dung chính từ Chương 1 đến Chương 6.
- `13-tai-lieu-trich-dan.md`: references tổng.
- `14-phu-luc.md`: phụ lục 1-4 và hướng dẫn cài đặt.
- `final/99-bao-cao-thesis-hoan-chinh.md`: assembled QA cho transition, continuity, figure/link integrity.

## Non-goals
- Không đổi logic kỹ thuật, số liệu, kết quả, tài liệu tham khảo hay kết luận học thuật cốt lõi.
- Không dùng file `final/` làm source edit chính.
- Không mở rộng scope sang diagram repo, code repo, config repo hoặc nội dung ngoài thesis chapters.
- Không biến luận văn thành bản phổ thông hóa; mục tiêu là dễ đọc hơn, không phải đơn giản hóa cực đoan.

## Validation gates trước khi implement
- Xác nhận mọi source file `00-14` đã có phase owner rõ ràng.
- Xác nhận không phase nào edit nhầm `final/` như source of truth.
- Xác nhận asset paths tương đối kiểu `./assets/...` vẫn hợp lệ từ chapter sources.
- Xác nhận cross-file transitions đọc mượt khi so trong assembled artifact.
- Chỉ rewrite theo chapter file / heading group; không bulk-edit mù toàn bộ final artifact.

## Exit criteria
- Mọi source chapter file `00-14` đều được map vào một phase cụ thể.
- Không còn vùng xám chưa có owner: front matter, chapters, references, appendices, transitions.
- Chương 3-4 có blueprint rewrite riêng vì là vùng readability nặng nhất.
- Coverage matrix xác nhận đủ file ownership, không chỉ line-range ở file final.
- Assembled artifact đọc liền mạch sau khi áp logic rewrite theo source files.

## Definition of done
- DoD cho một source file:
  - Section mở đầu rõ hơn về mục tiêu đọc.
  - Câu dài đã được tách ở các đoạn dense.
  - Bảng/code/config block lớn có ngữ cảnh đọc.
  - Kết hoặc chuyển ý cuối file không bị gắt.
- DoD cho một phase:
  - Tất cả file trong phase đạt DoD theo file.
  - QA continuity giữa các file trong phase đã xong.
  - Không có chỉnh sửa lạc sang file ngoài phase.
- DoD cho toàn plan:
  - `00-14` đã pass.
  - Final artifact QA không lộ link gãy, transition gãy, hoặc lệch giọng rõ rệt.

## Rủi ro chính
- Vẫn tư duy theo file final cũ, dẫn tới sửa sai nơi.
- Sửa chapter source đúng nhưng bỏ quên QA continuity ở bản assembled.
- Chỉ sửa chương chính nhưng bỏ sót `00`, `13`, `14`.

## Unresolved questions
- Không có ở thời điểm refine plan theo resources taxonomy mới.
