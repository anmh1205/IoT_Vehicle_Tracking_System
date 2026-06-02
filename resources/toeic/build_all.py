#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rebuild lesson pages with sequential nav footer. Usage: build_all.py [start] [end]"""
import glob
import json
import os
import sys
from notion_build import build

ROADMAP = "https://www.notion.so/372df50b1fcd8175aec7c6a1b7207ebd"
start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
end = int(sys.argv[2]) if len(sys.argv) > 2 else 35
here = os.path.dirname(__file__)


def url(pid):
    return "https://www.notion.so/" + pid.replace("-", "")


def short(title):
    return title.split(".", 1)[1].strip() if "." in title else title


items = []
for f in sorted(glob.glob(os.path.join(here, "lesson_*.json"))):
    n = int(os.path.basename(f).split("_")[1].split(".")[0])
    with open(f, encoding="utf-8") as fh:
        items.append((n, json.load(fh)))
items.sort(key=lambda x: x[0])

for i, (n, spec) in enumerate(items):
    if not (start <= n <= end):
        continue
    prev = items[i - 1][1] if i > 0 else None
    nxt = items[i + 1][1] if i + 1 < len(items) else None
    spec["nav"] = {
        "roadmap": ROADMAP,
        "review": "https://www.notion.so/81b35566346148f1874c9b6d350d8989",
        "prev": {"title": short(prev["title"]), "url": url(prev["page_id"])} if prev else None,
        "next": {"title": short(nxt["title"]), "url": url(nxt["page_id"])} if nxt else None,
    }
    build(spec)
