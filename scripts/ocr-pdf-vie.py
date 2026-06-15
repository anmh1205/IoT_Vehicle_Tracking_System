"""OCR Vietnamese scanned PDFs to text using PyMuPDF + Tesseract.

Usage: python ocr-pdf-vie.py <input.pdf> <output.txt> [dpi]
Prints per-page progress and writes combined text to output file.
"""
import sys
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io


def ocr_pdf(path, out_path, dpi=200):
    doc = fitz.open(path)
    n = len(doc)
    out = []
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=dpi)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        text = pytesseract.image_to_string(img, lang="vie+eng").strip()
        out.append(f"===== PAGE {i + 1}/{n} =====\n{text}")
        print(f"[{i + 1}/{n}] chars={len(text)}", flush=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(out))
    print(f"DONE -> {out_path}", flush=True)


if __name__ == "__main__":
    src = sys.argv[1]
    dst = sys.argv[2]
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 200
    ocr_pdf(src, dst, dpi)
