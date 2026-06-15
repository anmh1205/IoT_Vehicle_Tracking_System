#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Create 8 new tense lesson pages in the DB and print their IDs."""
from notion_build import _req

DB = "b1b4de15-0658-4928-a654-085ca24abac9"

NEW = [
    ("Hiện tại tiếp diễn",    "01 Thì", 3),
    ("Hiện tại hoàn thành tiếp diễn", "01 Thì", 5),
    ("Quá khứ tiếp diễn",     "01 Thì", 6),
    ("Quá khứ hoàn thành",    "01 Thì", 7),
    ("Quá khứ hoàn thành tiếp diễn", "01 Thì", 8),
    ("be going to",            "01 Thì", 10),
    ("Tương lai tiếp diễn",    "01 Thì", 11),
    ("Tương lai hoàn thành",   "01 Thì", 12),
]

for title, chuong, _ in NEW:
    pg = _req("POST", "/pages", {"parent": {"database_id": DB}, "properties": {
        "Bài học":    {"title": [{"type":"text","text":{"content": title}}]},
        "Chương":     {"select": {"name": chuong}},
        "Trạng thái": {"select": {"name": "Bắt đầu"}},
        "Phút":       {"number": 20},
    }})
    print(title, pg["id"])
