# Phase 03 — Chapters 01-02 context and requirements pass

## Context Links
- Source files:
  - `resources/reports/thesis/chapters/01-chuong-1-gioi-thieu.md`
  - `resources/reports/thesis/chapters/02-chuong-2-phan-tich.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`
- Covers: Chương 1, Chương 2, kết luận chương 1-2.

## Overview
- Priority: High
- Status: Planned
- Mục tiêu: làm rõ bài toán, mục tiêu, yêu cầu và nền tảng so sánh để người đọc hiểu vì sao hệ thống cần tồn tại trước khi đọc quyết định kỹ thuật sâu.

## Key Insights
- Chương 1 phải trả lời “đề tài này giải quyết việc gì” trước khi nói kiến trúc hay năng lượng.
- Chương 2 có nhiều bảng và ma trận; nếu thiếu câu dẫn/chốt thì người đọc thấy dữ liệu nhưng không thấy ý nghĩa.
- Với cấu trúc mới, mỗi chương nằm trong file riêng; đây là lúc dễ kiểm soát scope hơn nhưng cũng dễ quên QA nhịp chuyển giữa file `01` → `02` → `03`.

## Requirements
- Giữ nguyên mục tiêu, phạm vi, tiêu chí, ràng buộc và stakeholder requirements.
- Viết lại theo hướng context-first, user-first.
- Mỗi bảng/ma trận phải có câu giới thiệu và takeaway ngắn.
- Giảm trộn Việt-Anh nếu không cần cho lập luận.
- Sau khi sửa source files, dùng assembled artifact để QA nhịp nối sang Chương 3.

## Related Code Files
- Source of truth:
  - `resources/reports/thesis/chapters/01-chuong-1-gioi-thieu.md`
  - `resources/reports/thesis/chapters/02-chuong-2-phan-tich.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`

## Implementation Steps
1. Viết lại mở đầu `01-chuong-1-gioi-thieu.md` theo logic bối cảnh → vấn đề → động lực.
2. Làm rõ mục tiêu và phạm vi bằng câu ngắn, tránh đặc tả quá sớm.
3. Chuyển tiêu chí thiết kế từ dạng spec khô sang dạng “tiêu chí này để bảo đảm điều gì”.
4. Với `02-chuong-2-phan-tich.md`, thêm câu hỏi dẫn nhập trước các bảng so sánh.
5. Sau mỗi bảng/ma trận, thêm câu chốt vì sao nó quan trọng cho quyết định sau này.
6. Cập nhật kết luận chương 1-2 và QA nhịp chuyển sang cụm Chương 3 trong bản assembled.

## Todo List
- [ ] Rà lại mở đầu Chương 1.
- [ ] Giảm mật độ thuật ngữ ở 1.4.x.
- [ ] Gắn takeaway cho các bảng 2.2.x.
- [ ] Gắn lời dẫn cho 2.4.x.
- [ ] Cập nhật kết luận chương 1-2.
- [ ] QA chuyển sang Chương 3 trong bản assembled.

## Success Criteria
- Người đọc lướt Chương 1-2 vẫn nắm được bài toán, mục tiêu, yêu cầu và cơ sở lựa chọn.
- Không còn bảng/ma trận lớn nào đứng một mình mà thiếu ý nghĩa đọc.
- Kết luận chương 1-2 chốt được cầu nối sang Chương 3.

## Risk Assessment
- Giải thích quá nhiều làm phình nội dung.
- Rút gọn quá tay làm mất sắc thái của ràng buộc kỹ thuật.

## Security Considerations
- Giữ chính xác các tiêu chuẩn, ràng buộc thiết kế và mô tả stakeholder; không diễn giải sai yêu cầu an toàn/bảo mật.

## Next Steps
- Sang Phase 04, vùng rewrite quan trọng nhất: source files `03-06` của Chương 3.
