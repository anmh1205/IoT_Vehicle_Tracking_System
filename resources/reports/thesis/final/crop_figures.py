import fitz
import os
import sys
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\DATN-LE_TRONG_AN-21010389 (2).pdf'
out_dir = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis-chapters\assets\slide-bao-ve-do-an\pdf-cropped'
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)

# Crop regions: (page_0idx, name, top_ratio, bottom_ratio, left_ratio, right_ratio)
# Ratios are 0-1 of page dimensions
crops = [
    # Hình 3.1 - pipeline flow (middle of page 37)
    (36, "fig-3-1-pipeline", 0.25, 0.55, 0.05, 0.95),
    # Hình 3.2 - OBD-II BLE flow (middle of page 39)
    (38, "fig-3-2-obd-ble", 0.20, 0.55, 0.05, 0.95),
    # Hình 3.3 - LIS3DSH wake (top half of page 41)
    (40, "fig-3-3-lis3dsh", 0.10, 0.60, 0.05, 0.95),
    # Hình 3.4 - SIM7600 (top half of page 43)
    (42, "fig-3-4-sim7600", 0.10, 0.50, 0.05, 0.95),
    # Hình 3.5 - ESP32-S3 (middle of page 44)
    (43, "fig-3-5-esp32", 0.10, 0.55, 0.05, 0.95),
    # Hình 3.6 - System architecture (page 50)
    (49, "fig-3-6-architecture", 0.10, 0.65, 0.05, 0.95),
    # Hình 3.7 - Constraints map (page 52)
    (51, "fig-3-7-constraints", 0.08, 0.80, 0.05, 0.95),
    # Table 2.2 - Devices comparison (page 31-32, just get device images area)
    (30, "table-2-2-devices", 0.30, 0.85, 0.05, 0.95),
]

for page_idx, name, top_r, bot_r, left_r, right_r in crops:
    page = doc[page_idx]
    # Render at 2.5x for high quality
    mat = fitz.Matrix(2.5, 2.5)
    pix = page.get_pixmap(matrix=mat)
    
    # Calculate crop box
    w, h = pix.width, pix.height
    left = int(w * left_r)
    top = int(h * top_r)
    right = int(w * right_r)
    bottom = int(h * bot_r)
    
    # Save full then crop with PIL
    temp_path = os.path.join(out_dir, f"_temp.png")
    pix.save(temp_path)
    
    img = Image.open(temp_path)
    cropped = img.crop((left, top, right, bottom))
    out_path = os.path.join(out_dir, f"{name}.png")
    cropped.save(out_path)
    print(f"{name}.png: {cropped.width}x{cropped.height}")

# Clean temp
os.remove(os.path.join(out_dir, "_temp.png"))
print(f"\nDone! {len(crops)} cropped figures saved to {out_dir}")
