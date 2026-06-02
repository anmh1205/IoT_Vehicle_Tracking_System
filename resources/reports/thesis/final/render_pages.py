import fitz
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\DATN-LE_TRONG_AN-21010389 (2).pdf'
out_dir = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis-chapters\assets\slide-bao-ve-do-an\pdf-pages'
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)

# Render specific pages as high-res images (for figures that are vector/text-based)
pages_to_render = [
    (36, "page37-figure-3-1"),
    (38, "page39-figure-3-2"),
    (40, "page41-figure-3-3"),
    (42, "page43-figure-3-4"),
    (43, "page44-figure-3-5"),
    (49, "page50-figure-3-6"),
    (51, "page52-figure-3-7"),
    (30, "page31-table-2-2-devices"),
    (31, "page32-table-2-2-devices-cont"),
]

for page_idx, name in pages_to_render:
    page = doc[page_idx]
    # Render at 2x zoom for clarity
    mat = fitz.Matrix(2, 2)
    pix = page.get_pixmap(matrix=mat)
    out_path = os.path.join(out_dir, f"{name}.png")
    pix.save(out_path)
    print(f"Rendered {name}.png ({pix.width}x{pix.height})")
