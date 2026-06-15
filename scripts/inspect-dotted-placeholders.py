"""Dump pure-dotted placeholder paragraphs and form boundaries in the thesis docx.

A 'dotty' paragraph contains only dot-leaders (…, .), spaces, or is empty-ish.
We classify each by which review form it belongs to, based on the form headers.
NOTE: the GVHD/GVPB label lines on disk are STALE (template not yet saved), but
the dotted continuation paragraphs are unchanged, so their positions are valid.
"""
import sys
import re
from docx import Document

path = sys.argv[1]
doc = Document(path)

DOT_RE = re.compile(r"^[….\s]*$")

def is_dotty(t):
    return bool(t) and "…" in t and DOT_RE.match(t)

# Form header markers (in document order)
form = "PRE"
counts = {}
variants = {}
for i, p in enumerate(doc.paragraphs):
    t = p.text.strip()
    if "GIẢNG VIÊN HƯỚNG DẪN" in t and "NHẬN XÉT" in t:
        form = "GVHD"
    elif "GIẢNG VIÊN PHẢN BIỆN" in t and "NHẬN XÉT" in t:
        form = "GVPB"
    elif "BIÊN BẢN ĐÁNH GIÁ" in t:
        form = "FORM3"
    if is_dotty(t):
        counts[form] = counts.get(form, 0) + 1
        # record the exact distinct dotted strings per form
        key = (form, t)
        variants[key] = variants.get(key, 0) + 1

print("=== dotty counts per form ===")
for k, v in counts.items():
    print(f"{k}: {v}")

print("\n=== distinct dotted variants (form | len | count | repr) ===")
for (f, s), n in sorted(variants.items(), key=lambda x: (x[0][0], -x[1])):
    print(f"{f} | len={len(s)} | n={n} | {repr(s)}")
