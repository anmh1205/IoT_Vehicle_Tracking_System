import fitz
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\DATN-LE_TRONG_AN-21010389 (2).pdf'
doc = fitz.open(pdf_path)

# Pages 30-31 contain Bang 2.1
for page_idx in [29, 30, 31]:
    page = doc[page_idx]
    text = page.get_text()
    print(f"=== PAGE {page_idx+1} ===")
    print(text)
    print()
