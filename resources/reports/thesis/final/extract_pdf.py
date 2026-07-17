import fitz
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\DATN-LE_TRONG_AN-21010389 (2).pdf'
doc = fitz.open(pdf_path)

# Find all figure/table captions
print("=== FIGURES & TABLES IN PDF ===")
for i in range(len(doc)):
    text = doc[i].get_text()
    lines = text.split('\n')
    for l in lines:
        l = l.strip()
        if ('Hình' in l or 'Bảng' in l) and len(l) > 10 and len(l) < 150:
            if l.startswith('Hình') or l.startswith('Bảng'):
                print(f"p{i+1}: {l}")

# Extract images with their page numbers
print("\n=== IMAGES BY PAGE ===")
for i in range(len(doc)):
    imgs = doc[i].get_images()
    if imgs:
        print(f"p{i+1}: {len(imgs)} image(s)")

# Extract key chapter text (pages with chapter headings)
print("\n=== CHAPTER STRUCTURE ===")
for i in range(len(doc)):
    text = doc[i].get_text()
    lines = text.split('\n')
    for l in lines:
        l = l.strip()
        if l.startswith('CHƯƠNG') or l.startswith('Chương'):
            print(f"p{i+1}: {l}")
