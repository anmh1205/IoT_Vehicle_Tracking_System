"""Convert SVG -> PNG using svglib + reportlab. Usage: python convert_svg.py input.svg output.png [scale]"""
import sys
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM


def main():
    inp = sys.argv[1]
    out = sys.argv[2]
    scale = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
    drawing = svg2rlg(inp)
    drawing.scale(scale, scale)
    drawing.width = drawing.minWidth() * scale
    drawing.height = drawing.height * scale
    renderPM.drawToFile(drawing, out, fmt="PNG")
    print(f"OK -> {out}")


if __name__ == "__main__":
    main()
