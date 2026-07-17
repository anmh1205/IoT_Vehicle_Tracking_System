from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

base = r'E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis-chapters\assets\slide-bao-ve-do-an'

files = [
    ('slide-03-context.svg', 'slide-03-context.png'),
    ('slide-04-issues.svg', 'slide-04-issues.png'),
]

for svg_name, png_name in files:
    svg_path = os.path.join(base, svg_name)
    png_path = os.path.join(base, png_name)
    if not os.path.exists(svg_path):
        print(f"SKIP: {svg_name} not found")
        continue
    try:
        drawing = svg2rlg(svg_path)
        # Scale to 1920x1080
        scale = 1920 / drawing.width
        drawing.width *= scale
        drawing.height *= scale
        drawing.scale(scale, scale)
        renderPM.drawToFile(drawing, png_path, fmt='PNG', dpi=150)
        print(f"OK: {png_name} ({os.path.getsize(png_path)//1024} KB)")
    except Exception as e:
        print(f"FAIL: {svg_name} - {e}")
