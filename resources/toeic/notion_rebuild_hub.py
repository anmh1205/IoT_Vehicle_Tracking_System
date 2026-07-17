#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rebuild the TOEIC 650 hub into a clean, science-based dashboard and declutter."""
import time
from notion_build import _req, h2, callout

HUB = "356df50b-1fcd-811c-8477-cbd6cceb218a"
INTRO = "7decfaae-3fb9-4b1d-89a4-d16f54710e77"      # keep + update (anchor)
TOGGLE = "3bf4cbe1-bd70-45bf-8ce8-ae88df8b146c"     # keep + rename
LESSON_DB = "b1b4de15-0658-4928-a654-085ca24abac9"
SKILL_DB = "e79e3187-54d8-404a-9834-f4f46a7a70a6"

U = {
    "lesson": "https://www.notion.so/b1b4de1506584928a654085ca24abac9",
    "queue":  "https://www.notion.so/81b35566346148f1874c9b6d350d8989",
    "skill":  "https://www.notion.so/14c2084d5708417eaafbd14706af5736",
    "drill":  "https://www.notion.so/d7cc2040aacc4ec288dc8b4619d3bf1e",
    "qbank":  "https://www.notion.so/d94e5d288bbc42009c58d1f53d0c3d92",
    "mock":   "https://www.notion.so/ab59ae9fe3b64eb69f9609d9738abc61",
    "vocab":  "https://www.notion.so/eb1c9213568a4992a52295d0198686c3",
    "errors": "https://www.notion.so/a71fef253c554fabb127c2fcc0912ad9",
    "log":    "https://www.notion.so/9a898f1914074298b166dd8f2fe04f7e",
    "plan8":  "https://www.notion.so/4e20871effd94ff1887d07b743ced962",
    "strat":  "https://www.notion.so/357df50b1fcd8156b2c3c5bef6202a50",
}

ARCHIVE = [
    # 9 linked-view duplicates ("Untitled") in the hub dump
    "356df50b-1fcd-81f5-99d2-cd911df10f54", "356df50b-1fcd-818f-bbad-e6a1e2547648",
    "356df50b-1fcd-8164-b34c-f1bfb7ce998f", "356df50b-1fcd-8177-9218-d04fd52d3de6",
    "356df50b-1fcd-81ea-8dc6-cd1f121b313f", "357df50b-1fcd-81ac-94e7-cfe93e311837",
    "357df50b-1fcd-8141-84bc-cb6c46099148", "357df50b-1fcd-812f-9231-fadb84e93a45",
    "357df50b-1fcd-8191-a26e-d74382b7a73a",
    # 12 parallel chapter pages
    "358df50b-1fcd-815e-9818-c88385417021", "358df50b-1fcd-81b0-aa12-e16068f7b41d",
    "358df50b-1fcd-81a9-ba35-cd99c9a3db11", "358df50b-1fcd-81c1-a3e8-f79b9b854fd6",
    "358df50b-1fcd-81e0-8a0b-cee28593d60b", "358df50b-1fcd-815e-bc51-f2ac9a4a94f6",
    "358df50b-1fcd-819c-9ec1-fe5b9cc9b251", "358df50b-1fcd-81d3-9749-fa5fd00c709e",
    "358df50b-1fcd-8114-98cb-c68834ff74d8", "358df50b-1fcd-815f-9a88-efff2dde18d3",
    "358df50b-1fcd-8111-b121-cd7a0bdac990", "358df50b-1fcd-81be-a115-deae8f3864c7",
    # internal design notes + 2 redundant entry pages (folded into hub)
    "357df50b-1fcd-8104-bcf3-f3c969a4ed99",  # Ghi chú nghiên cứu v3
    "358df50b-1fcd-81f4-8a5c-f9da5f44cd69",  # Học Mỗi Ngày
    "357df50b-1fcd-8128-a196-facc6595e25d",  # Luồng điện thoại
]

DEL_TOP = [  # old hub text blocks 2..20 (keep INTRO + TOGGLE)
    "a05df00f-a8ca-421e-b6cd-3f112be83739", "f961ce98-c267-4a52-8a36-bbe552ee09b3",
    "ae7447ef-9a03-4fdb-95d4-8c12df49348e", "87e14cc7-eb21-40d8-a6a7-1f881f302c48",
    "d32b0b27-0c3c-47f6-81e0-a851cd77d5d0", "2633c643-aa6a-4611-98c0-1201aaaf67a1",
    "004f534d-18f7-4525-8474-a1681e373cc1", "c728b9ee-cdc7-43a1-8208-0228a2037179",
    "eabad832-801e-4466-9e02-d34bda142bc3", "921cf5f4-8afe-403b-acdc-05ab8cbb324b",
    "abf5e425-d183-45e7-ac8b-3f15d3a843c6", "c2a64b12-2aff-43d9-9044-3b185ef31657",
    "f967fafa-4142-4695-aa92-240f1145198a", "5b2aed60-154f-4c27-ba92-0ec7de05bb12",
    "49fe0194-379c-424d-a371-ab4745c85306", "782e119d-bb95-4ea0-9575-b0404189c083",
    "2e4db081-4794-4573-8804-8b3d14dc085d", "dd3acec5-3e9b-4339-a1e6-ed7bcb4ff284",
    "7d0524a3-53da-42f4-8b3a-07032ce73d9f",
]


def t(s, bold=False, url=None):
    r = {"type": "text", "text": {"content": s}, "annotations": {"bold": bold}}
    if url:
        r["text"]["link"] = {"url": url}
    return r


def num(runs):
    return {"type": "numbered_list_item", "numbered_list_item": {"rich_text": runs}}


def bullet(runs):
    return {"type": "bulleted_list_item", "bulleted_list_item": {"rich_text": runs}}


def co(runs, emoji, color):
    return {"type": "callout", "callout": {"rich_text": runs,
            "icon": {"type": "emoji", "emoji": emoji}, "color": color}}


DASH = [
    h2("🎯 Học hôm nay"),
    num([t("Ôn các thẻ ĐẾN HẠN trong "), t("Hàng đợi ôn tập", url=U["queue"]),
         t(" — nhớ được thì giãn lịch, quên/sai thì hẹn lại +1 ngày.")]),
    num([t("Học 1 bài mới trong "), t("Lộ trình ngữ pháp", url=U["lesson"]),
         t(" — chọn bài Trạng thái Bắt đầu/Đang học, theo đúng Thứ tự.")]),
    num([t("Soi "), t("Theo dõi kỹ năng", url=U["skill"]),
         t(" — ưu tiên phần đang ở mức Weak.")]),
    h2("🔁 Nhịp học 1 bài"),
    num([t("Mở 📖 Lý thuyết & ví dụ (gập sẵn) để hiểu nhanh.")]),
    num([t("Tự làm phần ✍️ Luyện tập TRƯỚC khi mở “Đáp án & giải thích”.")]),
    num([t("Làm 🏋️ Mini Test ở cuối bài để tự chấm.")]),
    num([t("Đổi Trạng thái: Đang học → Cần ôn (nếu sai) → Đã vững "),
         t("(Mini Test ≥ 13/16 và đã qua ít nhất 1 lần ôn cách quãng).")]),
    co([t("Luật ôn (SRS): lần đầu hẹn +1 ngày → nhớ được: +3 → +7 → +14 → +30 → thuộc. "
          "Quên/sai bất kỳ lúc nào: đặt lại về +1 ngày.")], "🔁", "orange_background"),
    h2("🗺️ Lộ trình & tài nguyên"),
    bullet([t("Lộ trình 35 bài (theo chương): "), t("Lộ trình ngữ pháp", bold=True, url=U["lesson"])]),
    bullet([t("Luyện & Thi: "), t("Bộ luyện", url=U["drill"]), t("  ·  "),
            t("Ngân hàng câu hỏi", url=U["qbank"]), t("  ·  "), t("Đề mô phỏng", url=U["mock"])]),
    bullet([t("Từ vựng: "), t("Ngân hàng từ vựng", url=U["vocab"])]),
    bullet([t("Ôn & Sửa lỗi: "), t("Hàng đợi ôn tập", url=U["queue"]), t("  ·  "),
            t("Sổ lỗi sai", url=U["errors"])]),
    bullet([t("Theo dõi & Kế hoạch: "), t("Theo dõi kỹ năng", url=U["skill"]), t("  ·  "),
            t("Nhật ký buổi học", url=U["log"]), t("  ·  "), t("Lộ trình 8 tuần", url=U["plan8"]),
            t("  ·  "), t("Chiến lược điểm số", url=U["strat"])]),
]


def go():
    print("1) rename skill DB")
    _req("PATCH", f"/databases/{SKILL_DB}",
         {"title": [{"type": "text", "text": {"content": "Bài kỹ năng & chiến lược"}}]})

    print("2) drop 2 redundant checkboxes on lesson DB")
    _req("PATCH", f"/databases/{LESSON_DB}",
         {"properties": {"Đã vững": None, "Hợp điện thoại": None}})

    print("3) update intro callout")
    _req("PATCH", f"/blocks/{INTRO}", {"callout": {
        "rich_text": [t("Trung tâm TOEIC 650 — bắt đầu ở đây. Mỗi ngày: mở mục “🎯 Học hôm nay”, "
                        "học 1 bài, tự làm trước khi xem đáp án, rồi đổi Trạng thái.")],
        "icon": {"type": "emoji", "emoji": "🎯"}, "color": "blue_background"}})

    print("4) append clean dashboard after intro")
    _req("PATCH", f"/blocks/{HUB}/children", {"children": DASH, "after": INTRO})

    print("5) delete old hub text blocks", len(DEL_TOP))
    for b in DEL_TOP:
        _req("DELETE", f"/blocks/{b}")
        time.sleep(0.03)

    print("6) rename data store toggle")
    _req("PATCH", f"/blocks/{TOGGLE}", {"toggle": {
        "rich_text": [t("📂 Kho dữ liệu (mở rộng)")], "color": "gray_background"}})

    print("7) archive clutter", len(ARCHIVE))
    for b in ARCHIVE:
        _req("DELETE", f"/blocks/{b}")
        time.sleep(0.03)

    print("DONE")


if __name__ == "__main__":
    go()
