import fitz
import sys
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\DATN-LE_TRONG_AN-21010389 (2).pdf'
doc = fitz.open(pdf_path)

for p in [30, 31, 32]:
    print(f"=== PAGE {p+1} ===")
    print(doc[p].get_text())
    print()
