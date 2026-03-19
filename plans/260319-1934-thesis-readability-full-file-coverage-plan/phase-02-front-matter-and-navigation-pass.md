# Phase 02 — Front matter and navigation pass

## Context Links
- Source file: `resources/reports/thesis/chapters/00-bia-va-phan-dau.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`
- Covers: review forms, cover, lời cam đoan, tóm tắt/abstract song ngữ, lời cảm ơn, mục lục, danh mục bảng/hình, danh mục từ viết tắt.

## Overview
- Priority: Medium
- Status: Planned
- Mục tiêu: làm phần mở đầu dễ quét, ít nặng, tạo nhịp đọc tốt trước khi vào nội dung kỹ thuật.

## Key Insights
- Trong taxonomy mới, toàn bộ front matter nằm gọn trong một source file `00`; đây là owner duy nhất cho lớp điều hướng đầu tài liệu.
- Tóm tắt song ngữ là phần khóa kỳ vọng đọc; nếu lệch scope giữa Việt/Anh, tài liệu sẽ mất cân xứng ngay từ đầu.
- Danh mục từ viết tắt là điểm chạm đầu tiên với thuật ngữ; tổ chức kém sẽ làm người đọc ngợp.

## Requirements
- Giữ giọng học thuật cho lời cam đoan/cảm ơn nhưng tránh dài dòng và lặp ý.
- Giữ abstract song ngữ cân xứng về phạm vi, kết quả và mức chi tiết.
- Xác nhận mục lục và danh mục khớp với cấu trúc source chapters thực tế.
- Chuẩn hóa từ viết tắt, tên Việt/Anh, cách viết hoa.
- Không dùng assembled file trong `final/` làm nơi sửa phần mở đầu.

## Related Code Files
- Source of truth: `resources/reports/thesis/chapters/00-bia-va-phan-dau.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`

## Implementation Steps
1. Rút gọn câu dài hoặc câu nghi thức lặp trong lời cam đoan nhưng giữ đủ tính pháp lý/trang trọng.
2. Rewrite tóm tắt tiếng Việt theo nhịp: bối cảnh → giải pháp → kết quả → từ khóa.
3. So khớp abstract tiếng Anh với bản tiếng Việt để tránh lệch scope hoặc lệch mức chi tiết kỹ thuật.
4. Rút gọn lời cảm ơn, giữ giọng chân thành nhưng không dàn trải.
5. Kiểm tra mục lục/danh mục có phản ánh đúng chapter source files 01-14 hay không.
6. Chuẩn hóa danh mục từ viết tắt theo format nhất quán và dễ tra nhanh.
7. Dùng assembled artifact để QA nhịp chuyển từ phần đầu sang Chương 1.

## Todo List
- [ ] Gọn lời cam đoan.
- [ ] Cân lại tóm tắt/abstract song ngữ.
- [ ] Gọn lời cảm ơn.
- [ ] So khớp mục lục với source chapters thực tế.
- [ ] Chuẩn hóa danh mục bảng/hình/từ viết tắt.
- [ ] QA chuyển sang Chương 1 trong bản assembled.

## Success Criteria
- `00-bia-va-phan-dau.md` đọc nhanh, không gây ngợp.
- Tóm tắt/abstract song ngữ cân xứng và giúp người đọc nắm đề tài trong một lượt đọc.
- Điều hướng đầu tài liệu khớp với thân bài tách chapter file.
- Không có chỉnh sửa front matter trực tiếp trong `final/`.

## Risk Assessment
- Sửa quá đà làm mất giọng trang trọng ở lời cam đoan/cảm ơn.
- Hai bản tóm tắt bị lệch nhau sau khi rewrite.
- Mục lục vẫn phản ánh cấu trúc cũ thay vì chapter sources hiện tại.

## Security Considerations
- Không thêm thông tin nhận diện cá nhân hoặc dữ liệu nhạy cảm ngoài những gì đã có.
- Không thêm credentials/config thật vào abstract khi đang cố giải thích hệ thống.

## Next Steps
- Sang Phase 03 để xử lý `01` và `02`.
