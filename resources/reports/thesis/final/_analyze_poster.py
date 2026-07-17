"""Analyze poster-preview.png for layout balance issues (whitespace gaps, fill)."""
from PIL import Image

im = Image.open("poster-preview.png").convert("RGB")
W, H = im.size
# downscale for speed
sw = 500
sh = int(H * sw / W)
sm = im.resize((sw, sh))
px = sm.load()

def near_white(c):
    return c[0] > 244 and c[1] > 244 and c[2] > 244

# per-row ink density
rows = []
for y in range(sh):
    ink = sum(0 if near_white(px[x, y]) else 1 for x in range(sw))
    rows.append(ink / sw)

total_white = sum(1 for y in range(sh) for x in range(sw) if near_white(px[x, y])) / (sw * sh)

# find longest run of near-empty rows (ink < 3%)
mm_per_row = 1189.0 / sh
best_len = best_start = cur = cur_start = 0
for y in range(sh):
    if rows[y] < 0.03:
        if cur == 0:
            cur_start = y
        cur += 1
        if cur > best_len:
            best_len, best_start = cur, cur_start
    else:
        cur = 0

# last content row (from bottom)
last = max((y for y in range(sh) if rows[y] >= 0.03), default=0)
first = min((y for y in range(sh) if rows[y] >= 0.03), default=0)

print(f"image: {W}x{H}px  ratio={W/H:.4f} (A0=0.7071)")
print(f"whitespace: {total_white*100:.1f}%  (target ~25-40%)")
print(f"content top margin: {first*mm_per_row:.0f}mm  bottom empty: {(sh-1-last)*mm_per_row:.0f}mm")
print(f"largest empty horizontal gap: {best_len*mm_per_row:.0f}mm at y={best_start*mm_per_row:.0f}mm (>=25mm looks bad)")
