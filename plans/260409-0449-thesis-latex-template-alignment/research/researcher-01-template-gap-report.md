# Researcher 01 Report — Template Gap

## Scope
- So sánh template tham chiếu và thesis hiện tại ở mức preamble + cấu trúc tài liệu.

## Findings
1. Template `.tex` có dạng fixed-position (nhiều `picture`, `tikz`, tọa độ tuyệt đối), khả năng cao là bản convert từ PDF, không phải nguồn semantic để viết thesis dài.
2. Thesis hiện tại dùng cấu trúc semantic, có macro `\frontmatterstart`, `\mainmatterstart`, `\chapterheading`; đây là nền tốt để bám template theo visual/style.
3. Thesis preamble có nhiều macro pandoc/highlight có thể dư cho báo cáo cuối, cần audit usage trước khi cắt.
4. Đã có phân tách frontmatter/mainmatter/appendix trong file hiện tại, giảm chi phí migration.

## Practical Direction
- Dùng template PDF làm visual ground truth 1:1.
- Dùng template TEX để lấy token style nếu token đó tái sử dụng được.
- Giữ semantic structure của thesis để maintainability, nhưng render ra giống template.

## Evidence
- Template TEX head có `\documentclass{article}`, `geometry margin=0`, overlay drawing primitives.
- Thesis TEX head có `extarticle`, `geometry 2.5cm`, `fontspec`, `titlesec`, macro chapter wrappers.
- Thesis có các mốc: `\frontmatterstart`, `\mainmatterstart`, `\chapterheading` cho chương 1..6 và phụ lục.

## Recommendation
- Triển khai theo thứ tự: preamble → frontmatter → mainmatter → appendix/bibliography → compile/diff.
- Không đụng nội dung học thuật.

## Unresolved questions
- Template TEX có phải artefact convert hay có bản source chuẩn khác?