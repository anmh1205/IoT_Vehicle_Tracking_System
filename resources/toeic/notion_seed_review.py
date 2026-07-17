#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Seed spaced-repetition review cards into 'Hàng đợi ôn tập' for lessons whose
Trạng thái is Cần ôn / Đang học / Đã vững (idempotent: skips titles already queued)."""
import datetime
from notion_build import _req

LESSON_DB = "b1b4de15-0658-4928-a654-085ca24abac9"
QUEUE = "81b35566-3461-48f1-874c-9b6d350d8989"
TODAY = datetime.date.today()

# status -> (days until first review, Status value, interval)
PLAN = {
    "Cần ôn": (0, "Today", "1 day"),
    "Đang học": (1, "Due", "1 day"),
    "Đã vững": (3, "Due", "3 days"),
}


def q(db):
    rows, cur = [], None
    while True:
        body = {"page_size": 100}
        if cur:
            body["start_cursor"] = cur
        r = _req("POST", f"/databases/{db}/query", body)
        rows += r["results"]
        if not r.get("has_more"):
            break
        cur = r["next_cursor"]
    return rows


def title_of(p, name):
    pr = p["properties"].get(name, {})
    if pr.get("type") == "title":
        return "".join(x["plain_text"] for x in pr["title"])
    return ""


def status_of(p):
    s = p["properties"].get("Trạng thái", {}).get("select")
    return s["name"] if s else ""


existing = {title_of(p, "Review Item") for p in q(QUEUE)}
created = 0
for p in q(LESSON_DB):
    st = status_of(p)
    if st not in PLAN:
        continue
    item = "Ôn: " + title_of(p, "Bài học")
    if item in existing:
        continue
    days, statval, interval = PLAN[st]
    due = (TODAY + datetime.timedelta(days=days)).isoformat()
    _req("POST", "/pages", {"parent": {"database_id": QUEUE}, "properties": {
        "Review Item": {"title": [{"type": "text", "text": {"content": item}}]},
        "Type": {"select": {"name": "Lesson"}},
        "Status": {"select": {"name": statval}},
        "Due Date": {"date": {"start": due}},
        "Next Interval": {"select": {"name": interval}},
        "Confidence": {"select": {"name": "Low"}},
    }})
    created += 1
print(f"seeded {created} review card(s)")
