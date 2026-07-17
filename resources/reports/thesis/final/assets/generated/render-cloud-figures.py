from PIL import Image, ImageDraw, ImageFont


ROOT = r"E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis\final\assets\figures-condensed-r2"
OUT_44 = ROOT + r"\09-chuong-4-trien-khai-cloud-hinh-4-15.png"
OUT_44A = ROOT + r"\09-chuong-4-trien-khai-cloud-hinh-4-16.png"

BG = "white"
LINE = "#4b5563"
TEXT = "#111827"
GROUP = "#eef2f7"
BLUE = "#eef4ff"
ORANGE = "#fff7ed"
GREEN = "#f0fdf4"
PURPLE = "#f5f3ff"


def font(size, bold=False):
    candidates = []
    if bold:
        candidates += [r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\seguisb.ttf"]
    candidates += [r"C:\Windows\Fonts\segoeui.ttf", r"C:\Windows\Fonts\arial.ttf"]
    for p in candidates:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT = font(24)
FONT_SM = font(22)
FONT_B = font(26, True)


def text_center(draw, box, text, fnt, fill=TEXT, spacing=6):
    x1, y1, x2, y2 = box
    bb = draw.multiline_textbbox((0, 0), text, font=fnt, spacing=spacing, align="center")
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    tx = x1 + (x2 - x1 - tw) / 2
    ty = y1 + (y2 - y1 - th) / 2 - 2
    draw.multiline_text((tx, ty), text, font=fnt, fill=fill, spacing=spacing, align="center")


def draw_box(draw, box, text, fill):
    draw.rounded_rectangle(box, radius=10, fill=fill, outline=LINE, width=2)
    text_center(draw, box, text, FONT)


def draw_group(draw, box, title):
    draw.rounded_rectangle(box, radius=16, fill=BG, outline="#cbd5e1", width=2)
    title_box = (box[0] + 16, box[1] + 8, box[0] + 320, box[1] + 44)
    text_center(draw, title_box, title, FONT_B, fill="#374151")


def arrow(draw, pts, fill=LINE, width=3):
    import math
    draw.line(pts, fill=fill, width=width)
    x1, y1 = pts[-2]
    x2, y2 = pts[-1]
    ang = math.atan2(y2 - y1, x2 - x1)
    size = 12
    p1 = (x2 - size * math.cos(ang - math.pi / 7), y2 - size * math.sin(ang - math.pi / 7))
    p2 = (x2 - size * math.cos(ang + math.pi / 7), y2 - size * math.sin(ang + math.pi / 7))
    draw.polygon([pts[-1], p1, p2], fill=fill)


def render_44():
    w, h = 1720, 300
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)

    boxes = [
        ((40, 90, 280, 210), "Thiết bị trên xe\nTạo bản tin giám sát", BLUE),
        ((330, 90, 540, 210), "EMQX\nTiếp nhận bản tin", BLUE),
        ((590, 90, 860, 210), "MQTT Bridge\nKiểm tra và phân luồng", BLUE),
        ((910, 75, 1220, 225), "Các kho lưu trữ\nPostgreSQL, VictoriaMetrics,\nVictoriaLogs", ORANGE),
        ((1270, 90, 1520, 210), "Khối xử lý phía máy chủ\nTra cứu, cảnh báo và API", GREEN),
        ((1270, 235, 1520, 295), "Giao diện quản lý", PURPLE),
    ]
    for b, t, f in boxes:
        draw_box(d, b, t, f)

    # arrows main flow
    arrow(d, [(280, 150), (330, 150)])
    arrow(d, [(540, 150), (590, 150)])
    arrow(d, [(860, 150), (910, 150)])
    arrow(d, [(1220, 150), (1270, 150)])
    arrow(d, [(1395, 210), (1395, 235)])

    img.save(OUT_44, quality=95)


def render_44a():
    w, h = 1600, 980
    img = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(img)

    g1 = (60, 40, 1540, 210)
    g2 = (60, 280, 1540, 540)
    g3 = (60, 620, 980, 860)
    g4 = (1080, 620, 1540, 860)

    for g, t in [
        (g1, "Nhóm tiếp nhận bản tin"),
        (g2, "Nhóm lưu trữ"),
        (g3, "Nhóm xử lý nghiệp vụ"),
        (g4, "Nhóm khai thác"),
    ]:
        draw_group(d, g, t)

    emqx = (240, 95, 580, 170)
    bridge = (950, 95, 1330, 170)
    postgres = (110, 360, 430, 445)
    metrics = (640, 360, 960, 445)
    logs = (1170, 360, 1490, 445)
    backend = (250, 705, 790, 800)
    web = (1130, 705, 1490, 780)

    draw_box(d, emqx, "EMQX\nNhận kết nối và bản tin MQTT", BLUE)
    draw_box(d, bridge, "MQTT Bridge\nKiểm tra và phân luồng", BLUE)
    draw_box(d, postgres, "PostgreSQL\nDữ liệu quản lý", ORANGE)
    draw_box(d, metrics, "VictoriaMetrics\nDữ liệu theo thời gian", ORANGE)
    draw_box(d, logs, "VictoriaLogs\nSự kiện và nhật ký", ORANGE)
    draw_box(d, backend, "Khối xử lý phía máy chủ\nTra cứu, cảnh báo và cấp dữ liệu", GREEN)
    draw_box(d, web, "Giao diện web\nTheo dõi và tra cứu", PURPLE)

    arrow(d, [(580, 132), (950, 132)])
    arrow(d, [(1120, 170), (1120, 250), (270, 250), (270, 360)])
    arrow(d, [(1170, 170), (1170, 270), (800, 270), (800, 360)])
    arrow(d, [(1220, 170), (1220, 290), (1330, 290), (1330, 360)])

    arrow(d, [(270, 445), (270, 585), (390, 585), (390, 705)])
    arrow(d, [(800, 445), (800, 705)])
    arrow(d, [(1330, 445), (1330, 585), (650, 585), (650, 705)])

    arrow(d, [(790, 752), (1130, 752)])

    img.save(OUT_44A, quality=95)


if __name__ == "__main__":
    render_44()
    render_44a()
    print(OUT_44)
    print(OUT_44A)
