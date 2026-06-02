"""Reduce section title font size where text is long enough to wrap."""
import win32com.client

ppt = win32com.client.Dispatch("PowerPoint.Application")
pres = ppt.Presentations(1)

for i in range(1, pres.Slides.Count + 1):
    s = pres.Slides(i)
    for shape in s.Shapes:
        if not shape.HasTextFrame or not shape.TextFrame.HasText:
            continue
        if shape.Top > 50:
            continue
        if shape.Name != "\uc81c\ubaa9 6":  # Korean placeholder name "제목 6"
            continue
        tr = shape.TextFrame.TextRange
        text = tr.Text.strip()
        # Long titles need smaller font
        if len(text) >= 20:
            old = tr.Font.Size
            tr.Font.Size = 26
            print(f"Slide {i}: '{text[:50]}' {old} -> 26")
        else:
            print(f"Slide {i}: '{text}' kept at {tr.Font.Size}")

pres.Save()
print("DONE")
