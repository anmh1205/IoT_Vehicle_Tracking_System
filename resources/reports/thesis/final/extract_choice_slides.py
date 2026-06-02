"""Extract data of slides 11-17 (the 7 LỰA CHỌN slides)."""
import json
import win32com.client

ppt = win32com.client.Dispatch("PowerPoint.Application")
pres = ppt.Presentations(1)

result = {}
for i in range(11, 18):
    s = pres.Slides(i)
    slide_data = {"index": i, "title": None, "table": [], "reason": None}
    for shape in s.Shapes:
        if shape.HasTextFrame and shape.TextFrame.HasText:
            text = shape.TextFrame.TextRange.Text.strip()
            if "LỰA CHỌN" in text:
                slide_data["title"] = text
            elif "Lý do" in text or "•" in text:
                slide_data["reason"] = text
        if shape.HasTable:
            table = shape.Table
            tbl_data = []
            for r in range(1, table.Rows.Count + 1):
                row = []
                for c in range(1, table.Columns.Count + 1):
                    cell = table.Cell(r, c)
                    txt = cell.Shape.TextFrame.TextRange.Text.strip() if cell.Shape.TextFrame.HasText else ""
                    row.append(txt)
                tbl_data.append(row)
            slide_data["table"] = tbl_data
    result[i] = slide_data

with open("choice_slides.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print("Wrote choice_slides.json")
