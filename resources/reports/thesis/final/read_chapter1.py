import fitz
import sys
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\DATN-LE_TRONG_AN-21010389 (2).pdf'
doc = fitz.open(pdf_path)

# Chapter 1 starts at page 27 (0-idx 26)
for p in [26, 27, 28, 29]:
    print(f"=== PAGE {p+1} ===")
    print(doc[p].get_text())
    print()
