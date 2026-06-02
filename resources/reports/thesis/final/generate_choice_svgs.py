"""Generate one SVG per slide 11..17 in unified comparison-card style.

Output viewBox: 1360 x 800 (matches PowerPoint placement 720x410 pt area).
- Top: short subtitle line (problem to solve)
- Body: 2-3 option cards horizontal, winner highlighted (filled header + ★ + larger total)
- Each card shows criteria as horizontal score bars (5-point scale)
- Bottom: 3 reason callouts (• why we chose the winner)
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "..", "..", "thesis-chapters", "assets", "slide-bao-ve-do-an")
OUT_DIR = os.path.abspath(OUT_DIR)

# Subtitle (1-line problem statement) per slide
PROBLEMS = {
    11: "Vấn đề: thu dữ liệu vận hành (RPM, tốc độ, mã lỗi…) qua cổng OBD-II — chọn cách ít can thiệp xe nhất",
    12: "Vấn đề: phát hiện chuyển động khi xe đỗ — phải nhạy nhưng cực kỳ tiết kiệm điện cho ắc quy",
    13: "Vấn đề: vừa truyền dữ liệu 4G vừa lấy GNSS — chọn module gọn, ít vùng phát nhiễu",
    14: "Vấn đề: chọn MCU đủ ngoại vi cho modem + BLE + IMU + cổng bảo trì, có dư tài nguyên cho OTA",
    15: "Vấn đề: nền tảng phần mềm nhúng chạy nhiều tác vụ song song và bảo trì dài hạn",
    16: "Vấn đề: giao thức gửi bản tin qua mạng di động — bản tin nhỏ, nhẹ, có gửi bù khi mất sóng",
    17: "Vấn đề: tổ chức máy chủ tiếp nhận và lưu trữ bản tin từ nhiều thiết bị đồng thời",
}

ACCENT = "#1a5276"
ACCENT_LIGHT = "#d6e4f0"
WINNER_BG = "#fefce8"
WINNER_BORDER = "#1a5276"


def parse_reasons(raw: str):
    """Extract 3 bullet reasons from the 'Lý do chọn' text."""
    lines = [ln.strip() for ln in raw.replace("\r", "\n").split("\n") if ln.strip()]
    bullets = [ln.lstrip("•").strip() for ln in lines if ln.startswith("•")]
    return bullets[:3]


def parse_score(s: str) -> float:
    s = s.strip().replace("✓", "").strip().replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def is_winner(s: str) -> bool:
    return "✓" in s


def winner_index(table):
    """Return column index (1-based: skip 'Tiêu chí' col 0) of the winner."""
    last = table[-1]
    for i, v in enumerate(last):
        if i == 0:
            continue
        if "✓" in v:
            return i
    return None


def short_option_name(name: str) -> str:
    """Strip the leading star marker and trim."""
    return name.replace("★", "").strip()


def render_score_bar(x, y, w, score, label_score):
    """5-point horizontal bar; score 0-5."""
    fill_w = w * (score / 5.0)
    bg = f'<rect x="{x}" y="{y}" width="{w}" height="14" rx="2" fill="#e5e7eb"/>'
    fg = f'<rect x="{x}" y="{y}" width="{fill_w:.1f}" height="14" rx="2" fill="{ACCENT}"/>'
    txt = f'<text x="{x + w + 8}" y="{y + 12}" font-size="16" font-weight="bold" fill="#000">{label_score}</text>'
    return bg + fg + txt


def build_svg(slide):
    idx = slide["index"]
    title = slide["title"]
    table = slide["table"]
    reasons = parse_reasons(slide["reason"])
    problem = PROBLEMS[idx]

    headers = table[0]  # ['Tiêu chí', 'opt1', 'opt2', ...]
    n_options = len(headers) - 1
    criteria_rows = table[1:-1]
    total_row = table[-1]

    win_col = winner_index(table)

    # Layout: single full-width "Bài toán" line + N option columns + reasons strip
    W, H = 1360, 800
    out = []
    out.append(
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
        f'font-family="Times New Roman, serif">'
    )
    out.append(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')

    # Top problem statement
    out.append(
        f'<rect x="20" y="20" width="{W - 40}" height="50" rx="6" fill="{ACCENT_LIGHT}" stroke="{ACCENT}" stroke-width="1"/>'
    )
    out.append(
        f'<text x="{W // 2}" y="52" text-anchor="middle" font-size="22" font-style="italic" fill="{ACCENT}">{problem}</text>'
    )

    # Cards layout: equal width
    margin = 20
    gap = 16
    card_top = 95
    card_h = 470
    avail = W - 2 * margin - gap * (n_options - 1)
    # Make winner slightly bigger (ratio 1.2 vs 1.0)
    weights = [1.2 if (i + 1) == win_col else 1.0 for i in range(n_options)]
    total_w = sum(weights) * (avail / sum(weights))
    base_w = avail / sum(weights)
    widths = [w * base_w for w in weights]

    x_cur = margin
    card_positions = []
    for ci in range(n_options):
        opt_name = short_option_name(headers[ci + 1])
        is_win = (ci + 1) == win_col
        cw = widths[ci]
        cx = x_cur
        cy = card_top
        card_positions.append((cx, cw))

        # Card frame
        bg = WINNER_BG if is_win else "#ffffff"
        border = WINNER_BORDER if is_win else "#94a3b8"
        bw = 4 if is_win else 2
        out.append(f'<rect x="{cx}" y="{cy}" width="{cw}" height="{card_h}" rx="8" fill="{bg}" stroke="{border}" stroke-width="{bw}"/>')

        # Header strip
        hdr_h = 70
        hdr_fill = ACCENT if is_win else "#475569"
        out.append(f'<rect x="{cx}" y="{cy}" width="{cw}" height="{hdr_h}" rx="8" fill="{hdr_fill}"/>')
        out.append(f'<rect x="{cx}" y="{cy + 40}" width="{cw}" height="{hdr_h - 40}" fill="{hdr_fill}"/>')
        # Star for winner
        star_prefix = "★ " if is_win else ""
        font_sz = 28 if is_win else 24
        out.append(
            f'<text x="{cx + cw / 2}" y="{cy + 44}" text-anchor="middle" font-size="{font_sz}" '
            f'font-weight="bold" fill="#ffffff">{star_prefix}{opt_name}</text>'
        )

        # Criteria + bars
        bar_x = cx + 18
        bar_w = cw - 36 - 30  # leave space for score number on right
        row_h = 60
        for ri, row in enumerate(criteria_rows):
            crit = row[0]
            score = parse_score(row[ci + 1])
            ry = cy + hdr_h + 22 + ri * row_h
            out.append(f'<text x="{cx + 18}" y="{ry}" font-size="18" fill="#000">{crit}</text>')
            out.append(render_score_bar(bar_x, ry + 10, bar_w, score, f"{score:.0f}"))

        # Total at bottom
        total_score_str = total_row[ci + 1].replace("✓", "").strip()
        total_y = cy + card_h - 36
        out.append(
            f'<line x1="{cx + 18}" y1="{total_y - 24}" x2="{cx + cw - 18}" y2="{total_y - 24}" stroke="#cccccc" stroke-width="1"/>'
        )
        total_label_x = cx + 18
        total_value_x = cx + cw - 18
        total_color = ACCENT if is_win else "#475569"
        out.append(
            f'<text x="{total_label_x}" y="{total_y}" font-size="20" font-weight="bold" fill="#000">Tổng</text>'
        )
        out.append(
            f'<text x="{total_value_x}" y="{total_y}" text-anchor="end" font-size="26" '
            f'font-weight="bold" fill="{total_color}">{total_score_str}</text>'
        )

        x_cur += cw + gap

    # Bottom strip: 3 reasons (why chosen)
    rs_top = card_top + card_h + 20
    rs_h = H - rs_top - 20
    # Title strip
    out.append(
        f'<rect x="20" y="{rs_top}" width="180" height="{rs_h}" rx="6" fill="{ACCENT}"/>'
    )
    out.append(
        f'<text x="110" y="{rs_top + rs_h / 2 - 8}" text-anchor="middle" font-size="22" '
        f'font-weight="bold" fill="#ffffff">LÝ DO</text>'
    )
    out.append(
        f'<text x="110" y="{rs_top + rs_h / 2 + 22}" text-anchor="middle" font-size="22" '
        f'font-weight="bold" fill="#ffffff">CHỌN</text>'
    )

    rcount = len(reasons) if reasons else 1
    avail_w = W - 220 - 20
    each_w = (avail_w - (rcount - 1) * 12) / rcount
    rx = 220
    for r in reasons:
        out.append(
            f'<rect x="{rx}" y="{rs_top}" width="{each_w}" height="{rs_h}" rx="6" '
            f'fill="#ffffff" stroke="{ACCENT}" stroke-width="2"/>'
        )
        # Wrap text
        out.extend(wrap_text(r, rx + 14, rs_top + 28, each_w - 28, 18, "#000", line_h=24))
        rx += each_w + 12

    out.append("</svg>")
    return "\n".join(out)


def wrap_text(text, x, y, max_width, font_size, color, line_h=20):
    """Naively wrap text by chars (CJK-ish): split into lines fitting max_width."""
    # Estimate char width: font_size * 0.5 for mixed Vietnamese
    char_w = font_size * 0.55
    chars_per_line = max(8, int(max_width / char_w))
    words = text.split(" ")
    lines = []
    cur = ""
    for w in words:
        if not cur:
            cur = w
        elif len(cur) + 1 + len(w) <= chars_per_line:
            cur += " " + w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    out = []
    for i, ln in enumerate(lines):
        # escape XML
        ln_safe = ln.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        out.append(f'<text x="{x}" y="{y + i * line_h}" font-size="{font_size}" fill="{color}">{ln_safe}</text>')
    return out


def main():
    with open(os.path.join(ROOT, "choice_slides.json"), encoding="utf-8") as f:
        data = json.load(f)
    for k, slide in data.items():
        svg = build_svg(slide)
        out_path = os.path.join(OUT_DIR, f"slide-{k}-choice.svg")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(svg)
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
