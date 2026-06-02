import fitz
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\DATN-LE_TRONG_AN-21010389 (2).pdf'
out_dir = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis-chapters\assets\slide-bao-ve-do-an\pdf-extracted'
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)

# Pages with figures we need (mapped from PDF analysis)
# Format: (page_0indexed, figure_name)
target_pages = [
    (36, "figure-3-1"),  # p37: Hình 3.1 Nguyên lý chuyển hóa dữ liệu
    (38, "figure-3-2"),  # p39: Hình 3.2 OBD-II qua vgate BLE
    (40, "figure-3-3"),  # p41: Hình 3.3 LIS3DSH khi xe đỗ
    (42, "figure-3-4"),  # p43: Hình 3.4 SIM7600CE-T
    (43, "figure-3-5"),  # p44: Hình 3.5 ESP32-S3 điều phối
    (49, "figure-3-6"),  # p50: Hình 3.6 Kiến trúc tổng thể
    (51, "figure-3-7"),  # p52: Hình 3.7 Ràng buộc kỹ thuật
    (53, "figure-4-1"),  # p54: Hình 4.1 Sơ đồ khối thiết bị
    (53, "figure-4-2"),  # p54: Hình 4.2 ESP32-S3 nhánh
    (54, "figure-4-3"),  # p55: Hình 4.3 Mô-đun bo mạch
    (55, "figure-4-4"),  # p56: Hình 4.4 Cấu trúc nguồn
    (56, "figure-4-5"),  # p57: Hình 4.5 PCB layout
    (57, "figure-4-6"),  # p58: Hình 4.6 Bo mạch hàn
    (57, "figure-4-7"),  # p58: Hình 4.7 Nguyên mẫu vỏ
    (58, "figure-4-8"),  # p59: Hình 4.8 Đóng vỏ
    (60, "figure-4-9"),  # p61: Hình 4.9 Flow khởi động
    (61, "figure-4-10"), # p62: Hình 4.10 Flow thu dữ liệu
    (62, "figure-4-11"), # p63: Hình 4.11 Flow ngủ/thức
    (64, "figure-4-12"), # p65: Hình 4.12 Server pipeline
    (65, "figure-4-13"), # p66: Hình 4.13 Server function groups
    (66, "figure-4-14"), # p67: Hình 4.14 Device list screen
    (67, "figure-4-15"), # p68: Hình 4.15 Map tracking
    (68, "figure-4-16"), # p69: Hình 4.16 Device detail
    (69, "figure-4-17"), # p70: Hình 4.17 Alert queue
    (74, "figure-4-18"), # p75: Hình 4.18 Power consumption chart
    (30, "table-2-2"),   # p31: Bảng 2.2 thiết bị thị trường (có ảnh)
]

extracted = []
for page_idx, name in target_pages:
    page = doc[page_idx]
    imgs = page.get_images()
    for img_idx, img in enumerate(imgs):
        xref = img[0]
        pix = fitz.Pixmap(doc, xref)
        if pix.n > 4:  # CMYK
            pix = fitz.Pixmap(fitz.csRGB, pix)
        suffix = "png"
        if img_idx == 0:
            fname = f"{name}.png"
        else:
            fname = f"{name}-{img_idx+1}.png"
        out_path = os.path.join(out_dir, fname)
        pix.save(out_path)
        extracted.append(f"{fname} ({pix.width}x{pix.height})")
        pix = None

print(f"Extracted {len(extracted)} images to {out_dir}")
for e in extracted:
    print(f"  {e}")
