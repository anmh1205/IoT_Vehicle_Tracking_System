import fitz
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\DATN-LE_TRONG_AN-21010389 (2).pdf'
out_dir = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis-chapters\assets\slide-bao-ve-do-an'
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)

# Page 31 (0-idx 30) and 32 (0-idx 31) have device images in table 2.2
for page_idx, label in [(30, 'page31'), (31, 'page32')]:
    page = doc[page_idx]
    imgs = page.get_images(full=True)
    for img_idx, img in enumerate(imgs):
        xref = img[0]
        pix = fitz.Pixmap(doc, xref)
        if pix.n > 4:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        out_path = os.path.join(out_dir, f"device-{label}-img{img_idx+1}.png")
        pix.save(out_path)
        print(f"{label}-img{img_idx+1}: {pix.width}x{pix.height}")
        pix = None

# Also read page 31 text to get full table 2.2 content with prices
print("\n=== PAGE 31 ===")
print(doc[30].get_text())
print("\n=== PAGE 32 ===")
print(doc[31].get_text())
