#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Audit the whole TOEIC 650 Notion space and print a compact structure map."""
import sys
from notion_build import _req

ROOT = "356df50b-1fcd-811c-8477-cbd6cceb218a"


def children(bid):
    out, cur = [], None
    while True:
        p = f"/blocks/{bid}/children?page_size=100"
        if cur:
            p += f"&start_cursor={cur}"
        r = _req("GET", p)
        out += r["results"]
        if not r.get("has_more"):
            break
        cur = r["next_cursor"]
    return out


def snip(b):
    t = b["type"]
    d = b.get(t, {})
    if isinstance(d, dict):
        rt = d.get("rich_text")
        if rt:
            return "".join(x.get("plain_text", "") for x in rt)[:70]
        if t in ("child_page", "child_database"):
            return d.get("title", "")
    return ""


def db_count(db):
    n, cur = 0, None
    while True:
        body = {"page_size": 100}
        if cur:
            body["start_cursor"] = cur
        try:
            r = _req("POST", f"/databases/{db}/query", body)
        except Exception as e:
            return f"ERR {e}"
        n += len(r["results"])
        if not r.get("has_more"):
            break
        cur = r["next_cursor"]
    return n


def outline(bid, indent):
    for b in children(bid):
        t = b["type"]
        s = snip(b)
        mark = ""
        if t == "child_database":
            mark = f"  [rows={db_count(b['id'])}]"
        print(f"{indent}- {t}: {s}{mark}  <{b['id'][:8]}>")
        # one level into pages/toggles to capture sub-structure
        if b.get("has_children") and t in ("toggle", "child_page", "column_list", "column"):
            outline(b["id"], indent + "    ")


print("=== ROOT HUB: TOEIC 650 - Trung tâm học ===")
outline(ROOT, "")
