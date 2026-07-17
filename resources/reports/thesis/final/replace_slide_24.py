"""Replace tables on slide 24 with the new energy SVG."""
import os
import win32com.client

ROOT = os.path.dirname(os.path.abspath(__file__))
SVG_PATH = os.path.abspath(os.path.join(ROOT, "..", "..", "thesis-chapters", "assets", "slide-bao-ve-do-an", "slide-24-energy.svg"))

ppt = win32com.client.Dispatch("PowerPoint.Application")
pres = ppt.Presentations(1)
s = pres.Slides(24)

to_delete = []
for shape in s.Shapes:
    if shape.HasTable:
        to_delete.append(shape.Name)
    elif shape.HasTextFrame and shape.TextFrame.HasText:
        text = shape.TextFrame.TextRange.Text.strip()
        if text.startswith("Thời gian duy trì") or text.startswith("→"):
            to_delete.append(shape.Name)
for name in to_delete:
    try:
        s.Shapes(name).Delete()
        print(f"Deleted {name}")
    except Exception as e:
        print(f"Failed {name}: {e}")

pic = s.Shapes.AddPicture(SVG_PATH, False, True, 0, 88, 720, 410)
print("Inserted SVG")
pres.Save()
print("DONE")
