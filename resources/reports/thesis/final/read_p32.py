import fitz
import sys
sys.stdout.reconfigure(encoding='utf-8')
doc = fitz.open(r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\DATN-LE_TRONG_AN-21010389 (2).pdf')
for p in [31, 32]:
    print(f"=== PAGE {p+1} ===")
    print(doc[p].get_text())
