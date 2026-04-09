# Planner Synthesis Report

## Task
- Chuẩn hóa thesis LaTeX theo template 1:1.
- Giữ nguyên nội dung học thuật.
- Chỉ chỉnh format/style/structure.
- Engine compile chuẩn: XeLaTeX.

## Synthesis
1. Template tham chiếu `.tex` có đặc trưng fixed-position, phù hợp làm nguồn token style và visual anchor, không phù hợp copy nguyên để maintain tài liệu dài.
2. Thesis hiện tại có cấu trúc semantic tốt (`frontmatter/mainmatter/chapter wrappers`), nên hướng đúng là map style template vào cấu trúc hiện tại.
3. Rủi ro chính: drift style do macro dư và lệch font/layout khi compile XeLaTeX.
4. Kế hoạch tách 6 phase theo thứ tự an toàn: audit -> preamble -> frontmatter -> mainmatter -> appendix/bibliography -> compile+diff.

## Hard Constraints (locked)
- Không chỉnh nội dung học thuật.
- Không implement ở bước plan.
- Chỉ tác động file `.tex` mục tiêu ở bước thực thi sau.

## Acceptance (locked)
- XeLaTeX >= 2 pass, không lỗi fatal.
- Visual checklist pass cho cover/frontmatter/mainmatter/appendix/reference.
- Mismatch còn lại phải chứng minh là do khác nội dung, không do format.

## Unresolved questions
- Template TEX có phải artefact convert từ PDF hay có source semantic chuẩn hơn?