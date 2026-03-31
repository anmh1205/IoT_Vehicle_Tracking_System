# Research Report: Readability heuristics cho thesis kỹ thuật

**Timestamp:** 2026-04-01 00:15:58 (Asia/Saigon)

## Executive Summary
Mục tiêu của thesis cho hội đồng không chuyên là: đúng kỹ thuật, đọc nhanh được, ít jargon, dễ soi hình/bảng, dễ trích ý chính. Nguyên tắc thực dụng nhất là viết theo kiểu “kết luận trước, chi tiết sau”: mở đầu bằng mục đích và kết quả, giữ thuật ngữ chuyên môn ở mức tối thiểu, và đẩy thao tác dài/cụ thể xuống phụ lục.

Khi rút gọn nội dung, ưu tiên theo thứ tự: tóm tắt → kết luận/đóng góp → kết quả chính → hình/bảng then chốt → phụ lục thao tác. Phần mô tả quy trình dài, pseudo-steps, thông số phụ nên chuyển sang phụ lục hoặc chú thích ngắn gọn ở dưới hình/bảng.

## Research Methodology
- Nguồn tham khảo: 5
- Phạm vi thời gian: tài liệu nền tảng + hướng dẫn hiện hành
- Từ khóa: plain language, technical report writing, figure captions, table captions, thesis formatting, Mermaid syntax, report structure, appendices

## Key Findings

### 1. Viết cho hội đồng không chuyên
- Dùng câu ngắn, chủ-vị rõ, 1 ý chính/1 câu.
- Nêu “vì sao quan trọng” trước “cách làm”.
- Giải thích thuật ngữ lần đầu xuất hiện; sau đó dùng nhất quán.
- Tránh acronym nếu không thật cần; nếu cần thì khai báo một lần.
- Không “dịch sai” kỹ thuật để dễ hiểu; hãy đổi cách diễn đạt, không đổi bản chất.

### 2. Giảm jargon nhưng giữ đúng kỹ thuật
- Thay jargon bằng mô tả chức năng hoặc tác dụng.
- Nếu buộc phải dùng thuật ngữ, kèm định nghĩa ngắn ngay lần đầu.
- Dùng ví dụ/so sánh chỉ để hỗ trợ hiểu, không để thay thế định nghĩa kỹ thuật.
- Ưu tiên động từ cụ thể hơn danh từ trừu tượng.

### 3. Chuẩn hóa caption hình/bảng và nhãn sơ đồ
- Figure caption: mô tả ngắn, dưới hình; Table caption: ngắn, trên bảng.
- Caption phải trả lời: đây là gì, dùng để làm gì, đọc ra sao.
- Mỗi hình/bảng/sơ đồ có số thứ tự thống nhất xuyên suốt.
- Với Mermaid/UML: nhãn nút phải là ngôn ngữ nghiệp vụ, không nhét quá nhiều text.
- Nếu sơ đồ phức tạp, chia thành nhiều sơ đồ con thay vì một hình quá tải.
- Nên có caption “tự đứng được”: người đọc lướt caption vẫn hiểu ý chính.

### 4. Quy tắc ưu tiên khi rút gọn
- Giữ: mục tiêu, đóng góp, kết quả, kết luận, hạn chế chính.
- Giảm: mô tả nền tảng đã phổ biến, bước thao tác lặp, cấu hình chi tiết.
- Chuyển sang phụ lục: log, command, tham số, bảng dài, checklist triển khai.
- Nếu phải cắt, cắt phần “how-to” trước; không cắt phần “so what”.
- Tóm tắt không được chứa chi tiết mới ngoài nội dung chính.

## Comparative Analysis
- Plain language phù hợp nhất cho thesis có hội đồng đa ngành.
- Caption chuẩn giúp tăng khả năng quét nhanh và giảm hiểu sai.
- Phụ lục là nơi hợp lý nhất cho thao tác/triển khai; đừng để làm loãng phần chính.

## Implementation Recommendations

### Quick Start Guide
1. Viết outline theo thứ tự: problem → approach → result → conclusion.
2. Đánh dấu mọi từ chuyên môn; chỉ giữ từ thật cần thiết.
3. Mỗi hình/bảng/sơ đồ viết caption 1–2 câu, đủ tự hiểu.
4. Chuyển chi tiết thực thi sang phụ lục.
5. Soát lại: người ngoài ngành có hiểu kết quả và ý nghĩa không.

### Common Pitfalls
- Dùng quá nhiều acronym.
- Caption kiểu “Figure 3. Architecture” quá chung chung.
- Nhét toàn bộ quy trình vào body thay vì phụ lục.
- Giải thích dài nhưng không nói rõ kết luận.
- Diagram quá nhiều node, text quá dài, khó trình bày.

## Resources & References

### Official / Authoritative References
- [WHO: Use plain language](https://www.who.int/about/communications/understandable/plain-language)
- [Cambridge Plain Language Writing Guide](https://www.cambridgema.gov/-/media/Files/humanrightscommission/languagejustice/cambridgeplainlanguagewritingguide.pdf)
- [Mermaid syntax reference](https://mermaid.ai/open-source/intro/syntax-reference.html)
- [University of Sussex: Guide to Technical Report Writing](https://www.sussex.ac.uk/ei/internal/forstudents/engineeringdesign/studyguides/techreportwriting)
- [UBC Grad School: Tables, Figures and Illustrations](https://www.grad.ubc.ca/current-students/dissertation-thesis-preparation/tables-figures-illustrations)
- [BCcampus: Figures and Tables](https://pressbooks.bccampus.ca/technicalwriting/chapter/figurestables/)
- [SFU thesis formatting: tables/figures](https://www.lib.sfu.ca/help/publish/thesis/format/tables-figures-illustrations)
- [GOV.UK research reports guidance](https://assets.publishing.service.gov.uk/media/67489b9d5ba46550018cebd8/Research_reports_guidance.pdf)

## Appendices

### A. Glossary
- Jargon: từ chuyên môn khó với người ngoài ngành.
- Caption tự đứng được: chú thích đủ nghĩa khi tách khỏi hình/bảng.
- Appendix: phần phụ lục chứa chi tiết dài, ít cần ở luồng đọc chính.

### B. Practical Caption Rules
- Hình: caption ngắn, đặt dưới.
- Bảng: caption ngắn, đặt trên.
- Caption nên nêu mục đích hoặc insight, không chỉ mô tả hình học.
- Sơ đồ: nhãn ngắn, nhất quán, tránh câu dài trong node.

### C. Prioritization Rule of Thumb
- Giữ trong body: what, why, result, limitation.
- Đẩy xuống appendix: how-to chi tiết, command, config, số liệu thô.

## Unresolved questions
- Hội đồng của thesis này ưu tiên phong cách academic nghiêm hay trình bày dễ đọc hơn?
- Có cần chuẩn caption theo quy định trường/khoa cụ thể không?
- Có cần bộ quy ước thuật ngữ song ngữ Việt/Anh cho toàn thesis không?
