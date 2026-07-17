#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate a real, navigable roadmap page by querying the Notion databases
(works around the API's inability to create filtered/grouped DB views)."""
import time
from notion_build import _req, h2, h3, bullet, callout

HUB = "356df50b-1fcd-811c-8477-cbd6cceb218a"
LESSON_DB = "b1b4de15-0658-4928-a654-085ca24abac9"
QUEUE_DB = "81b35566-3461-48f1-874c-9b6d350d8989"
TITLE = "🗺️ Lộ trình ngữ pháp (35 bài)"

# hub blocks to repoint to the new page
B_LEARN = "372df50b-1fcd-81aa-9fd0-dc0c26bf9329"   # "Học bài mới..."
B_ROADMAP = "372df50b-1fcd-81d8-b9b9-d1597eba43dc"  # "Lộ trình 35 bài..."

STATUS_EMOJI = {"Khóa": "🔒", "Bắt đầu": "🆕", "Đang học": "📖",
                "Cần ôn": "🔁", "Đã vững": "✅"}
ACTIVE = {"Bắt đầu", "Đang học", "Cần ôn"}


def t(s, bold=False, url=None):
    r = {"type": "text", "text": {"content": s}, "annotations": {"bold": bold}}
    if url:
        r["text"]["link"] = {"url": url}
    return r


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


def plain(prop):
    if not prop:
        return ""
    if prop["type"] == "title":
        return "".join(x["plain_text"] for x in prop["title"])
    if prop["type"] == "rich_text":
        return "".join(x["plain_text"] for x in prop["rich_text"])
    if prop["type"] == "select":
        return prop["select"]["name"] if prop["select"] else ""
    if prop["type"] == "number":
        return prop["number"]
    if prop["type"] == "date":
        return prop["date"]["start"] if prop["date"] else ""
    return ""


def find_or_create_page():
    r = _req("GET", f"/blocks/{HUB}/children?page_size=100")
    for b in r["results"]:
        if b["type"] == "child_page" and b["child_page"]["title"].startswith("🗺️ Lộ trình"):
            # clear existing children for idempotent rebuild
            kids = _req("GET", f"/blocks/{b['id']}/children?page_size=100")["results"]
            for k in kids:
                _req("DELETE", f"/blocks/{k['id']}")
                time.sleep(0.03)
            return b["id"]
    pg = _req("POST", "/pages", {"parent": {"page_id": HUB},
              "icon": {"type": "emoji", "emoji": "🗺️"},
              "properties": {"title": {"title": [t(TITLE)]}}})
    return pg["id"]


def build():
    lessons = q(LESSON_DB)
    rows = []
    for p in lessons:
        pr = p["properties"]
        rows.append({
            "title": plain(pr.get("Bài học")),
            "order": plain(pr.get("Thứ tự")) or 0,
            "chuong": plain(pr.get("Chương")),
            "status": plain(pr.get("Trạng thái")),
            "focus": plain(pr.get("Trọng tâm TOEIC")),
            "url": p["url"],
        })
    rows.sort(key=lambda x: x["order"])

    from collections import Counter
    cnt = Counter(r["status"] or "Chưa mở" for r in rows)
    vung, can, dang, bd = cnt.get("Đã vững", 0), cnt.get("Cần ôn", 0), cnt.get("Đang học", 0), cnt.get("Bắt đầu", 0)
    chua = len(rows) - vung - can - dang - bd
    prog = (f"📊 Tiến độ: ✅ {vung} vững  ·  🔁 {can} cần ôn  ·  📖 {dang} đang học  ·  "
            f"🆕 {bd} bắt đầu  ·  🔒 {chua} chưa mở   (tổng {len(rows)} bài)")

    blocks = [{"type": "callout", "callout": {"rich_text": [t(
        "Lộ trình 35 bài theo 12 chương. Học theo thứ tự; chọn bài 🆕/📖/🔁 để học hoặc ôn, "
        "rồi đổi Trạng thái sau khi làm xong.")],
        "icon": {"type": "emoji", "emoji": "🗺️"}, "color": "blue_background"}}]
    blocks.append({"type": "callout", "callout": {"rich_text": [t(prog)],
                  "icon": {"type": "emoji", "emoji": "📊"}, "color": "green_background"}})

    # next-up
    nxt = [r for r in rows if r["status"] in ACTIVE][:6]
    blocks.append(h2("▶️ Nên học tiếp"))
    if nxt:
        for r in nxt:
            em = STATUS_EMOJI.get(r["status"], "▫️")
            blocks.append(bullet([t(f"{em} "), t(r["title"], url=r["url"]),
                                  t(f"  ·  {r['status']}")]))
    else:
        blocks.append(bullet([t("Chưa có bài nào ở trạng thái Bắt đầu/Đang học/Cần ôn.")]))

    # due review
    due = []
    for p in q(QUEUE_DB):
        pr = p["properties"]
        st = plain(pr.get("Status"))
        if st in ("Due", "Today"):
            due.append((plain(pr.get("Review Item")), plain(pr.get("Type")),
                        plain(pr.get("Due Date")), st))
    blocks.append(h2("🔁 Đang đến hạn ôn"))
    if due:
        for name, typ, dd, st in due:
            tail = "  ·  ".join(x for x in [typ, dd, st] if x)
            blocks.append(bullet([t(f"{name}" + (f"  ·  {tail}" if tail else ""))]))
    else:
        blocks.append(bullet([t("Không có mục nào đang Due/Today trong Hàng đợi ôn tập.")]))

    blocks.append({"type": "divider", "divider": {}})
    blocks.append(h2("🗺️ Toàn bộ lộ trình (mở từng chương)"))
    chapters = []
    for r in rows:
        if not chapters or chapters[-1][0] != r["chuong"]:
            chapters.append((r["chuong"], []))
        em = STATUS_EMOJI.get(r["status"], "▫️")
        chapters[-1][1].append(bullet([t(f"{em} "), t(r["title"], url=r["url"])]))
    for name, kids in chapters:
        blocks.append({"type": "heading_3", "heading_3": {
            "rich_text": [t(name or "Khác")], "is_toggleable": True, "children": kids}})

    blocks.append({"type": "callout", "callout": {"rich_text": [t(
        "Chú thích: 🆕 Bắt đầu · 📖 Đang học · 🔁 Cần ôn · ✅ Đã vững · 🔒 Khóa · ▫️ chưa đặt.")],
        "icon": {"type": "emoji", "emoji": "ℹ️"}, "color": "gray_background"}})
    return blocks


def append(pid, blocks):
    for i in range(0, len(blocks), 90):
        _req("PATCH", f"/blocks/{pid}/children", {"children": blocks[i:i + 90]})
        time.sleep(0.3)


def repoint(url):
    _req("PATCH", f"/blocks/{B_LEARN}", {"numbered_list_item": {"rich_text": [
        t("Học 1 bài mới trong "), t("Lộ trình ngữ pháp", url=url),
        t(" — chọn bài 🆕/📖/🔁 theo đúng thứ tự.")]}})
    _req("PATCH", f"/blocks/{B_ROADMAP}", {"bulleted_list_item": {"rich_text": [
        t("Lộ trình 35 bài (theo chương): "), t("Lộ trình ngữ pháp", bold=True, url=url)]}})


if __name__ == "__main__":
    pid = find_or_create_page()
    print("page", pid)
    append(pid, build())
    url = "https://www.notion.so/" + pid.replace("-", "")
    repoint(url)
    print("done", url)
