# Phase 07 — References, appendices and consistency pass

## Context Links
- Source files:
  - `resources/reports/thesis/chapters/13-tai-lieu-trich-dan.md`
  - `resources/reports/thesis/chapters/14-phu-luc.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`
- Covers: references tổng, phụ lục 1-4, đoạn chuyển ý, checklist/hướng dẫn cài đặt, consistency pass toàn file.

## Overview
- Priority: High
- Status: Ready
- Mục tiêu: đóng coverage toàn file, xử lý các vùng dễ bị quên, và thống nhất giọng/thuật ngữ/readability sau khi các chapter pass hoàn tất.

## Execution order inside phase
1. `13-tai-lieu-trich-dan.md`
2. `14-phu-luc.md`
3. QA continuity + asset/link integrity trong assembled artifact

## Key Insights
- Resources taxonomy mới tách references và appendices thành hai source files riêng (`13`, `14`); đây phải là owner chính, không phải file assembled trong `final/`.
- Kết luận chương, đoạn chuyển ý, checklist, hướng dẫn cài đặt là các vùng có tác động lớn tới cảm giác mượt của tài liệu dù không nằm ở “nội dung chính”.
- Đây là phase chốt để bảo đảm user request “không bỏ sót phần nào” được đáp ứng thật sự.

## Requirements
- Rà `13-tai-lieu-trich-dan.md` để giữ format references nhất quán, không lệch style.
- Với `14-phu-luc.md`, chỉ chỉnh readability và dẫn đường; không thay đổi bản chất tài liệu bổ trợ.
- Toàn file phải thống nhất cách dùng Việt/Anh, thuật ngữ, bullet/table intros, giọng văn và độ dài câu.
- Dùng file final assembled để QA continuity, internal links và asset paths sau khi các source files đã được sửa.

## Related Code Files
- Source of truth:
  - `resources/reports/thesis/chapters/13-tai-lieu-trich-dan.md`
  - `resources/reports/thesis/chapters/14-phu-luc.md`
- Validation artifact: `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh.md`

## Implementation Steps
1. Rà `13-tai-lieu-trich-dan.md` và chuẩn hóa format/trình bày nếu lệch.
2. Rà `14-phu-luc.md`: tài chính, tiêu chuẩn, timeline, supporting materials, đặc biệt chú ý install/run guide.
3. Cập nhật câu dẫn/chú giải ngắn cho checklist, bảng, lệnh cài đặt nếu thiếu ngữ cảnh.
4. Rà lại tất cả kết luận chương, tóm tắt, đoạn nối giữa các chapter files qua bản assembled.
5. Chạy consistency pass toàn file: thuật ngữ, trộn Việt-Anh, giọng văn, cấu trúc câu, nhịp đọc.
6. Xác nhận asset/link paths và continuity trong `final/99-bao-cao-thesis-hoan-chinh.md`.

## File handoff checklist
- [ ] References không lệch format giữa các nhóm [A]-[D].
- [ ] Appendix sections có intro đủ để đọc theo thứ tự.
- [ ] Install guide có prerequisite, step order và expected outcome đủ rõ.
- [ ] QA assembled không lộ link gãy hoặc transition gãy.

## Todo List
- [ ] Chuẩn hóa references trong `13`.
- [ ] Rà phụ lục 1-4 trong `14`.
- [ ] Căn lại hướng dẫn cài đặt/chạy hệ thống.
- [ ] Cập nhật kết luận chương và đoạn chuyển ý qua assembled QA.
- [ ] Chạy consistency pass toàn file.
- [ ] QA asset/link integrity trong bản assembled.

## Success Criteria
- References, appendices và các vùng phụ không bị bỏ sót.
- Hướng dẫn cài đặt/triển khai trong phụ lục đọc theo thứ tự rõ, không gây rối.
- Kết luận chương và chuyển ý tạo mạch liền cho toàn tài liệu.
- Không còn sự lệch giọng hoặc lệch level diễn giải giữa các phần.
- Final artifact được QA như assembled output, không bị dùng sai vai trò làm source edit chính.

## Definition of Done
- `13` và `14` hoàn tất theo đúng execution order.
- Cả hai file pass file handoff checklist.
- QA continuity + asset/link integrity pass trong assembled artifact.

## Risk Assessment
- Dễ xem nhẹ appendices và chỉ sửa qua loa.
- Sửa consistency quá rộng có thể chạm vào nhiều vùng nhỏ, làm diff khó kiểm soát.
- QA continuity bị bỏ qua vì các source files đã “đúng riêng lẻ”.

## Security Considerations
- Không thêm secret thật hoặc thông tin nhạy cảm khi chỉnh các đoạn môi trường/cài đặt/tài khoản minh họa.
- Nếu phát hiện credentials demo trong phụ lục, chỉ giữ sample đã công khai; không mở rộng thêm.

## Next Steps
- Sau phase này, plan coverage xem như complete và sẵn sàng cho rewrite execution theo source chapter files.
