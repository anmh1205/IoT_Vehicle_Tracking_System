#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TOEIC lesson builder for Notion.

- Lists all lessons in the grammar roadmap DB (Notion-Version 2022-06-28 can query a database).
- Rebuilds a lesson page from a compact spec into the "Bài 12" format
  (callout intro, parts with theory + per-question toggles, mini test, summary).

Usage:
  python notion_build.py list
  python notion_build.py build <lesson_json_file>
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

TOKEN = os.environ.get("NOTION_TOKEN", "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")
DB_ID = "b1b4de15-0658-4928-a654-085ca24abac9"
API = "https://api.notion.com/v1"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}


def _req(method, path, body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode("utf-8"), file=sys.stderr)
        raise


def list_lessons():
    out, cursor = [], None
    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        r = _req("POST", f"/databases/{DB_ID}/query", body)
        for pg in r["results"]:
            props = pg["properties"]
            title = "".join(t["plain_text"] for t in props["Bài học"]["title"])
            order = props.get("Thứ tự", {}).get("number")
            out.append((order, title, pg["id"]))
        if not r.get("has_more"):
            break
        cursor = r["next_cursor"]
    out.sort(key=lambda x: (x[0] is None, x[0]))
    return out


# ---------- block helpers ----------
def rt(text, bold=False, code=False, url=None):
    d = {"content": text}
    if url:
        d["link"] = {"url": url}
    return {"type": "text", "text": d, "annotations": {"bold": bold, "code": code}}


def para(runs):
    return {"type": "paragraph", "paragraph": {"rich_text": runs}}


def h2(text):
    return {"type": "heading_2", "heading_2": {"rich_text": [rt(text)]}}


def h3(text):
    return {"type": "heading_3", "heading_3": {"rich_text": [rt(text)]}}


def bullet(runs):
    return {"type": "bulleted_list_item", "bulleted_list_item": {"rich_text": runs}}


def callout(text, emoji, color):
    return {"type": "callout", "callout": {
        "rich_text": [rt(text)], "icon": {"type": "emoji", "emoji": emoji}, "color": color}}


def divider():
    return {"type": "divider", "divider": {}}


def toggle_block(title, children, color="default"):
    return {"type": "toggle", "toggle": {
        "rich_text": [rt(title, bold=True)], "color": color, "children": children}}


def table_block(headers, rows):
    kids = []
    for r in [headers] + rows:
        kids.append({"type": "table_row", "table_row": {"cells": [[rt(str(c))] for c in r]}})
    return {"type": "table", "table": {
        "table_width": len(headers), "has_column_header": True,
        "has_row_header": False, "children": kids}}


def knowledge_blocks(items):
    out = []
    for it in items:
        t = it["type"]
        if t == "h3":
            out.append(h3(it["text"]))
        elif t == "p":
            out.append(para([rt(it["text"])]))
        elif t == "key":
            out.append(callout(it["text"], it.get("emoji", "🔑"), "orange_background"))
        elif t == "warn":
            out.append(callout(it["text"], "⚠️", "yellow_background"))
        elif t == "note":
            out.append(callout(it["text"], it.get("emoji", "💡"), it.get("color", "gray_background")))
        elif t == "ul":
            for b in it["items"]:
                out.append(bullet([rt(b)]))
        elif t == "table":
            out.append(table_block(it["headers"], it["rows"]))
    return out


def question(n, body, ans):
    q = para([rt(f"Câu {n}. ", bold=True), rt(body)])
    if "||" in ans:
        head, rest = ans.split("||", 1)
        child = para([rt(head, bold=True), rt(rest)])
    else:
        child = para([rt(ans)])
    tog = {"type": "toggle", "toggle": {
        "rich_text": [rt("Đáp án & giải thích")],
        "children": [child]
    }}
    return [q, tog]


def build_blocks(spec):
    blocks = []
    for c in spec.get("intro", []):
        blocks.append(callout(c["text"], c.get("emoji", "📘"), c.get("color", "blue_background")))
    if spec.get("knowledge"):
        blocks.append(divider())
        blocks.append(h2("📚 Kiến thức đầy đủ"))
        blocks.extend(knowledge_blocks(spec["knowledge"]))
    n = 0
    for part in spec["parts"]:
        blocks.append(divider())
        blocks.append(h2(part["heading"]))
        # gom lý thuyết + ví dụ vào 1 toggle thu gọn cho gọn trang
        theory = []
        if not spec.get("knowledge"):
            for p in part.get("theory", []):
                theory.append(para([rt(p)]))
            for k in part.get("keys", []):
                theory.append(callout(k, "🔑", "orange_background"))
            for tr in part.get("traps", []):
                theory.append(callout(tr, "⚠️", "yellow_background"))
            if part.get("examples"):
                theory.append(callout("Ví dụ:", "📝", "gray_background"))
                for ex in part["examples"]:
                    theory.append(bullet([rt(ex)]))
        if theory:
            blocks.append(toggle_block("📖 Lý thuyết & ví dụ", theory))
        ph = part.get("practice_heading") or "✍️ Luyện tập"
        blocks.append(h3(ph if ph.startswith(("✍", "Luyện")) else ph))
        for item in part.get("questions", []):
            n += 1
            blocks.extend(question(n, item["q"], item["a"]))
    # mini test
    mt = spec.get("minitest")
    if mt:
        blocks.append(divider())
        blocks.append(h2(mt["heading"]))
        blocks.append(callout(mt["note"], "⏱️", "blue_background"))
        for item in mt["questions"]:
            n += 1
            blocks.extend(question(n, item["q"], item["a"]))
    # summary
    if spec.get("summary"):
        blocks.append(divider())
        blocks.append(h2("✅ Chốt bài"))
        for s in spec["summary"]:
            blocks.append(bullet([rt(s)]))
    for c in spec.get("summary_callouts", []):
        blocks.append(callout(c["text"], c.get("emoji", "💡"), c.get("color", "green_background")))
    nav = spec.get("nav")
    if nav:
        blocks.append(divider())
        runs = []
        if nav.get("prev"):
            runs.append(rt("← " + nav["prev"]["title"], url=nav["prev"]["url"]))
            runs.append(rt("      "))
        runs.append(rt("🗺️ Lộ trình", bold=True, url=nav["roadmap"]))
        if nav.get("review"):
            runs.append(rt("      "))
            runs.append(rt("🔁 Ôn lại", url=nav["review"]))
        if nav.get("next"):
            runs.append(rt("      "))
            runs.append(rt(nav["next"]["title"] + " →", url=nav["next"]["url"]))
        blocks.append(para(runs))
    return blocks


def clear_page(page_id):
    r = _req("GET", f"/blocks/{page_id}/children?page_size=100")
    for b in r["results"]:
        _req("DELETE", f"/blocks/{b['id']}")
        time.sleep(0.03)
    # repeat if more remain
    if r.get("has_more"):
        clear_page(page_id)


def _weight(b):
    # đếm cả block con lồng bên trong (toggle) để không vượt giới hạn 100 block/request
    w = 1
    for v in b.values():
        if isinstance(v, dict):
            for kid in v.get("children", []) or []:
                w += _weight(kid)
    return w


def append_blocks(page_id, blocks):
    chunk, weight = [], 0
    for b in blocks:
        w = _weight(b)
        if chunk and weight + w > 95:
            _req("PATCH", f"/blocks/{page_id}/children", {"children": chunk})
            time.sleep(0.3)
            chunk, weight = [], 0
        chunk.append(b)
        weight += w
    if chunk:
        _req("PATCH", f"/blocks/{page_id}/children", {"children": chunk})
        time.sleep(0.3)


def build(spec):
    pid = spec["page_id"]
    print("Clearing", pid)
    clear_page(pid)
    blocks = build_blocks(spec)
    print("Appending", len(blocks), "blocks")
    append_blocks(pid, blocks)
    print("Done", spec.get("title"))


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "list":
        for o, t, i in list_lessons():
            print(f"{o}\t{t}\t{i}")
    elif len(sys.argv) >= 3 and sys.argv[1] == "build":
        with open(sys.argv[2], encoding="utf-8") as f:
            data = json.load(f)
        specs = data if isinstance(data, list) else [data]
        for s in specs:
            build(s)
    else:
        print(__doc__)
