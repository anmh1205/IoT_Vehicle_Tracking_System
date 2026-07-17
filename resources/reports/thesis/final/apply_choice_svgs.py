"""Replace tables + reason textboxes on slides 11..17 with our new infographic SVGs."""
import os
import win32com.client

ROOT = os.path.dirname(os.path.abspath(__file__))
SVG_DIR = os.path.abspath(os.path.join(ROOT, "..", "..", "thesis-chapters", "assets", "slide-bao-ve-do-an"))

ppt = win32com.client.Dispatch("PowerPoint.Application")
pres = ppt.Presentations(1)

for i in range(11, 18):
    s = pres.Slides(i)
    # Collect shapes to delete: tables + the "Lý do chọn" textbox
    to_delete = []
    for shape in s.Shapes:
        if shape.HasTable:
            to_delete.append(shape.Name)
        elif shape.HasTextFrame and shape.TextFrame.HasText:
            text = shape.TextFrame.TextRange.Text.strip()
            if text.startswith("Lý do chọn") or text.startswith("• "):
                to_delete.append(shape.Name)
    for name in to_delete:
        try:
            s.Shapes(name).Delete()
            print(f"  Slide {i}: deleted {name}")
        except Exception as e:
            print(f"  Slide {i}: failed to delete {name}: {e}")

    # Insert new SVG
    svg_path = os.path.join(SVG_DIR, f"slide-{i}-choice.svg")
    if os.path.exists(svg_path):
        # Insert: from x=0 y=88, w=720 h=410 (matches other 16:9 area in this template)
        pic = s.Shapes.AddPicture(svg_path, False, True, 0, 88, 720, 410)
        print(f"Slide {i}: inserted SVG")
    else:
        print(f"Slide {i}: missing SVG {svg_path}")

pres.Save()
print("DONE")
