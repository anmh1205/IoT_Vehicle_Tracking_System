# Researcher 02 Report — XeLaTeX Compile & Diff Strategy

## Scope
- Xây checklist compile/validation cho mục tiêu bám template 1:1.

## Findings
1. Engine mục tiêu đã chốt: XeLaTeX. Cần chuẩn hóa font qua `fontspec` và policy fallback rõ ràng.
2. Bám 1:1 yêu cầu thêm visual review, không chỉ dựa vào compile pass.
3. Tài liệu lớn + nhiều bảng/hình => bắt buộc compile >=2 pass để ổn định ref/toc.

## Compile Checklist (proposed)
- Pass 1: `xelatex -interaction=nonstopmode -halt-on-error thesis.tex`
- Pass 2: lặp lại cùng lệnh.
- Pass 3 (optional): khi còn unresolved warning về refs/toc.
- Capture: lỗi fatal, missing font, missing figure, overfull blocks nghiêm trọng.

## Visual Diff Checklist (proposed)
- Cover: font, cỡ chữ, căn giữa, khoảng cách dọc.
- Frontmatter: thứ tự trang, số trang roman, heading style.
- Mainmatter: chapter heading, section spacing, caption style.
- Appendix + references: heading style, spacing, indent.

## Acceptance Rule
- Accept khi compile sạch lỗi fatal và tất cả mục style checklist đạt.
- Mismatch còn lại chỉ được chấp nhận nếu chứng minh là khác nội dung học thuật.

## Unresolved questions
- Có cần pixel-level diff tự động hay chỉ cần checklist thủ công có bằng chứng ảnh chụp?