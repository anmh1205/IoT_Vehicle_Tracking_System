# Coverage matrix — thesis readability full-file

## Mục tiêu
Khóa coverage theo cấu trúc `resources/reports/thesis/chapters/` để khi rewrite không bỏ sót bất kỳ source file nào; dùng assembled file trong `final/` chỉ để QA continuity toàn luận văn.

## Coverage matrix

| Nhóm | Source file(s) | Nội dung | Risk | Phase owner | Execution order | Ghi chú readability |
|---|---|---|---|---|---:|---|
| Front matter A | `chapters/00-bia-va-phan-dau.md` | Review forms, cover, lời cam đoan, tóm tắt/abstract song ngữ | High | Phase 02 | 1 | Gọn, cân xứng Việt/Anh, khóa kỳ vọng đọc sớm |
| Front matter B | `chapters/00-bia-va-phan-dau.md` | Lời cảm ơn, mục lục, danh mục bảng/hình, từ viết tắt | High | Phase 02 | 1 | Phải scan nhanh, đồng nhất tên gọi, hỗ trợ điều hướng |
| Chapter 1 | `chapters/01-chuong-1-gioi-thieu.md` | Bối cảnh, mục tiêu, tiêu chí, phương pháp, kết luận chương 1 | High | Phase 03 | 2 | Context-first, giải nghĩa thuật ngữ sớm |
| Chapter 2 | `chapters/02-chuong-2-phan-tich.md` | Problem statement, background, requirements, stakeholder matrices, kết luận chương 2 | High | Phase 03 | 3 | Bảng/ma trận phải có intro + takeaway |
| Chapter 3A | `chapters/03-chuong-3-giai-phap-phan-cung.md` | Hardware analysis, OBD2, IMU, power design, BOM | Very High | Phase 04 | 4 | Decision-first, giảm ngợp thông số |
| Chapter 3B | `chapters/04-chuong-3-giai-phap-firmware.md` | Firmware rationale, layered architecture, BLE, modem, power, state machine, config | Very High | Phase 04 | 5 | Tách vấn đề/chọn/cách hoạt động |
| Chapter 3C | `chapters/05-chuong-3-giai-phap-backend.md` | Cloud rationale, EMQX, DB strategy, API, WebSocket, security | Very High | Phase 04 | 6 | Luồng dữ liệu trước stack nội bộ |
| Chapter 3D | `chapters/06-chuong-3-giai-phap-frontend.md` | Frontend rationale, FSD, pages, realtime map, UX, kết luận chương 3 | Very High | Phase 04 | 7 | Tránh dồn framework terms |
| Chapter 4A | `chapters/07-chuong-4-trien-khai-hardware.md` | Detailed hardware design, assembly, vehicle installation | High | Phase 05 | 8 | Narrative trước sơ đồ/bảng chân/chú thích |
| Chapter 4B | `chapters/08-chuong-4-trien-khai-firmware.md` | Firmware implementation, BLE-OBD2, MQTT modem, power sleep, state machine, telemetry | Very High | Phase 05 | 9 | Input → xử lý → output trước code/config |
| Chapter 4C | `chapters/09-chuong-4-trien-khai-cloud.md` | Docker infra, MQTT bridge, backend, frontend, monitoring, hardening | Very High | Phase 05 | 10 | Tách reference block khỏi narrative |
| Chapter 4D | `chapters/10-chuong-4-ket-qua-do-luong.md` | Tóm tắt, test setup, test results, chapter conclusion | High | Phase 05 | 11 | Nêu ý nghĩa kết quả trước số liệu |
| Chapter 5 | `chapters/11-chuong-5-danh-gia.md` | Hiệu năng, kinh tế, môi trường, rủi ro, khuyến nghị, kết luận chương 5 | Medium | Phase 06 | 12 | Gom nhóm kết quả/rủi ro/roadmap |
| Chapter 6 | `chapters/12-chuong-6-phan-hoi.md` | Earlier course work, complex problems, ethics, reflection, kết luận chương 6 | Medium | Phase 06 | 13 | Gắn mọi nhận định với ví dụ thật |
| References master | `chapters/13-tai-lieu-trich-dan.md` | Tài liệu trích dẫn [A]-[D] | Medium | Phase 07 | 14 | Chủ yếu chuẩn hóa format và nhất quán |
| Appendices | `chapters/14-phu-luc.md` | Phụ lục 1-4, supporting materials, install/run guide | High | Phase 07 | 15 | Tránh dump thông tin; hướng dẫn phải có trình tự rõ |
| Assembled QA | `final/99-bao-cao-thesis-hoan-chinh.md` | Continuity toàn file, transition giữa chapter files, asset/link integrity | High | Phase 07 | 16 | QA only, không dùng làm source edit chính |

## Cross-cutting zones bắt buộc rà riêng

| Vùng | Phạm vi | Owner | Handoff check |
|---|---|---|---|
| Abstract song ngữ | `00-bia-va-phan-dau.md` | Phase 02 | Việt/Anh cân xứng scope, kết quả, từ khóa |
| Kết luận chương | `01-12` | Phase 03/04/05/06/07 | Có chốt ý + nối sang phần kế |
| Đoạn chuyển ý | Giữa chapter files + trong assembled artifact | Phase tương ứng + Phase 07 | Không nhảy đột ngột khi ráp file |
| Bảng/ma trận | `02`, `03-06`, `11`, `14` | Phase 03/04/06/07 | Có intro trước bảng, takeaway sau bảng |
| Code/config blocks | `07-10`, `14` | Phase 05/07 | Có chú thích đọc block để thấy điều gì |
| Asset/link paths | `chapters/**/*` + final QA | Phase 02-07 + Phase 07 | `./assets/...` và internal references không gãy |
| Danh mục từ viết tắt | `00` + lần xuất hiện đầu ở các chapter | Phase 02 + phases tương ứng | Giải nghĩa đủ dùng cho người đọc không chuyên |

## Completion checklist
- [ ] Mọi source file `00-14` có phase owner.
- [ ] Thứ tự chạy 1→16 đã được khóa.
- [ ] Abstract song ngữ đã được rà ở `00`.
- [ ] Mọi chapter conclusion có owner.
- [ ] References tổng đã được rà ở `13`.
- [ ] Phụ lục 1-4 và install guide đã được rà ở `14`.
- [ ] Assembled QA đã được dùng để check continuity, không dùng làm source edit chính.
- [ ] Không có rewrite nào vượt khỏi non-goals.

## Unresolved questions
- Không có ở thời điểm refine plan theo folder resources mới.
