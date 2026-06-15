#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Renumber all 43 lessons. Run after creating the 8 new tense pages."""
from notion_build import _req
import time

# New ordered list: (new_number, new_title, page_id)
PLAN = [
    # Chương 01 Thì – 12 bài
    (1,  "01. Quá khứ đơn",                    "357df50b-1fcd-815d-8d93-d764afaeb1ef"),
    (2,  "02. Hiện tại đơn",                    "357df50b-1fcd-813b-a487-e193fde78544"),
    (3,  "03. Hiện tại tiếp diễn",              "37adf50b-1fcd-8196-8bdb-da7aed5aa5f2"),
    (4,  "04. Hiện tại hoàn thành",             "357df50b-1fcd-8110-a051-c3b6835af7d5"),
    (5,  "05. Hiện tại hoàn thành tiếp diễn",   "37adf50b-1fcd-81f8-842c-e61a605e50c5"),
    (6,  "06. Quá khứ tiếp diễn",               "37adf50b-1fcd-81d4-9886-ff3d40325430"),
    (7,  "07. Quá khứ hoàn thành",              "37adf50b-1fcd-81c4-aa0e-fe19142311a5"),
    (8,  "08. Quá khứ hoàn thành tiếp diễn",    "37adf50b-1fcd-8190-9c55-f5555ae94188"),
    (9,  "09. Tương lai với will",               "357df50b-1fcd-811b-a130-e48c812c2442"),
    (10, "10. be going to",                      "37adf50b-1fcd-81d4-9710-c2532f5b5b00"),
    (11, "11. Tương lai tiếp diễn",              "37adf50b-1fcd-8105-a1e3-ddce2a052380"),
    (12, "12. Tương lai hoàn thành",             "37adf50b-1fcd-816b-b118-cc0166c96824"),
    # Chương 02 Loại từ – 4 bài → 13-16
    (13, "13. Trạng từ",                         "357df50b-1fcd-813b-bfce-e7beeaa26b68"),
    (14, "14. Tính từ",                          "357df50b-1fcd-81f2-b583-e256fd12a0ef"),
    (15, "15. Liên từ",                          "357df50b-1fcd-8163-8348-eb760e87e7c3"),
    (16, "16. Giới từ",                          "357df50b-1fcd-81f5-935c-e90c583b3dc6"),
    # Chương 03 Hòa hợp chủ-vị – 3 bài → 17-19
    (17, "17. Hòa hợp chủ-vị cơ bản",           "357df50b-1fcd-8182-9773-e82271b2e527"),
    (18, "18. Either/Neither trong hòa hợp chủ-vị", "357df50b-1fcd-81a4-87f9-cd2ac539a1cf"),
    (19, "19. Danh từ tập hợp",                  "357df50b-1fcd-8186-9680-fd039f8bb64c"),
    # Chương 04 Động từ dạng đặc biệt – 3 bài → 20-22
    (20, "20. Động từ nguyên mẫu có to",         "357df50b-1fcd-81a0-8ba6-d4a53e86b254"),
    (21, "21. Danh động từ",                     "357df50b-1fcd-8177-8e4f-c3ad2a79289e"),
    (22, "22. Danh động từ và nguyên mẫu có to", "357df50b-1fcd-814b-bf2f-cf414c432548"),
    # Chương 05 Động từ khuyết thiếu – 3 bài → 23-25
    (23, "23. Can và Could",                     "357df50b-1fcd-81a5-ab1d-e1e223fc0155"),
    (24, "24. Should và Ought to",               "357df50b-1fcd-81d1-ad02-c4816dd38290"),
    (25, "25. Must và Have to",                  "357df50b-1fcd-81a0-89d9-f61f4159443d"),
    # Chương 06 Câu bị động – 3 bài → 26-28
    (26, "26. Câu bị động cơ bản",               "357df50b-1fcd-8158-994e-e6f12376655a"),
    (27, "27. Câu bị động với modal",            "357df50b-1fcd-8123-8d15-ea6f3fa477c1"),
    (28, "28. Câu bị động hoàn thành",           "357df50b-1fcd-8150-bef7-e365f7cdfda8"),
    # Chương 07 Mệnh đề quan hệ – 2 bài → 29-30
    (29, "29. Mệnh đề quan hệ không xác định",   "357df50b-1fcd-81b9-bb3b-ec34c9aa2135"),
    (30, "30. Mệnh đề quan hệ xác định",         "357df50b-1fcd-8149-87f8-d35e544284f5"),
    # Chương 08 Mệnh đề khác – 2 bài → 31-32
    (31, "31. Mệnh đề nhượng bộ",                "357df50b-1fcd-819c-9c36-dbd484c84c4f"),
    (32, "32. Mệnh đề trạng ngữ chỉ thời gian",  "357df50b-1fcd-8193-abf6-e06c53c267c0"),
    # Chương 09 Câu điều kiện – 4 bài → 33-36
    (33, "33. Câu điều kiện loại 1",             "357df50b-1fcd-81be-b66a-c5cc94d1da05"),
    (34, "34. Câu điều kiện loại 0",             "357df50b-1fcd-8198-b4a0-dd8f94f36e86"),
    (35, "35. Câu điều kiện loại 2",             "357df50b-1fcd-819b-b40d-c42ca637c003"),
    (36, "36. Câu điều kiện loại 3",             "357df50b-1fcd-8129-9d7c-cac56ae7aefe"),
    # Chương 10 Câu tường thuật – 2 bài → 37-38
    (37, "37. Câu hỏi gián tiếp",               "357df50b-1fcd-81a0-946e-fcb1bc148fc8"),
    (38, "38. Câu tường thuật",                  "357df50b-1fcd-8110-b5e4-cdc1eb049576"),
    # Chương 11 So sánh – 3 bài → 39-41
    (39, "39. So sánh nhất",                     "357df50b-1fcd-81af-bc88-ed5f3aaca762"),
    (40, "40. So sánh hơn",                      "357df50b-1fcd-8176-b0e3-e07d51f560eb"),
    (41, "41. So sánh ngang bằng",               "357df50b-1fcd-81d9-a483-fcb133abd6b1"),
    # Chương 12 Đảo ngữ – 2 bài → 42-43
    (42, "42. Đảo ngữ điều kiện",               "357df50b-1fcd-8179-9139-ee10814f7954"),
    (43, "43. Đảo ngữ phủ định",                "357df50b-1fcd-81c5-9576-c7ebf2eb919b"),
]

for n, title, pid in PLAN:
    _req("PATCH", f"/pages/{pid}", {"properties": {
        "Bài học": {"title": [{"type":"text","text":{"content": title}}]},
        "Thứ tự":  {"number": n},
    }})
    print(f"  {n:02d}. {title[:40]}")
    time.sleep(0.05)
print("Done renumbering 43 lessons.")
