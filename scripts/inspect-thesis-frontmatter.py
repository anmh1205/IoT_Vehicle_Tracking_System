"""Locate front-matter section markers in the thesis docx (acknowledgement,
abstract, review, table of contents) so we know where to insert review forms."""
import sys
from docx import Document

path = sys.argv[1]
doc = Document(path)

markers = [
    "NHẬN XÉT", "NHAN XET", "LỜI CẢM ƠN", "LOI CAM ON", "LỜI CAM ĐOAN",
    "TÓM TẮT", "TOM TAT", "ABSTRACT", "MỤC LỤC", "MUC LUC",
    "DANH MỤC", "GIẢNG VIÊN HƯỚNG DẪN", "GIẢNG VIÊN PHẢN BIỆN",
]

print(f"TOTAL PARAGRAPHS: {len(doc.paragraphs)}")
lo = int(sys.argv[2]) if len(sys.argv) > 2 else 0
hi = int(sys.argv[3]) if len(sys.argv) > 3 else 120
for i, p in enumerate(doc.paragraphs):
    if i < lo or i > hi:
        continue
    t = p.text
    print(f"[{i}] ({p.style.name}) |{t}|")
