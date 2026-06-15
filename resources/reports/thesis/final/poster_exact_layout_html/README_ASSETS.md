# Hướng dẫn sử dụng bộ HTML poster

## 1. Mở poster
- Giải nén file ZIP.
- Mở `index.html` bằng Chrome hoặc Edge.
- Các phần chữ chính có thể sửa trực tiếp vì đã đặt `contenteditable="true"`.

## 2. Cấu trúc asset
```
poster_exact_layout_html/
├─ index.html
└─ assets/
   ├─ images/
   │  ├─ system-overview.jpg
   │  ├─ pcb-layout.png
   │  ├─ pcb-annotated.jpg
   │  ├─ assembled-board.jpg
   │  ├─ device-case.jpg
   │  ├─ server-flow.png
   │  ├─ dashboard-devices.jpg
   │  └─ dashboard-map.jpg
   └─ icons/
      ├─ github-actions.svg
      ├─ docker.svg
      ├─ emqx.svg
      ├─ mqtt.svg
      ├─ express.svg
      ├─ typescript.svg
      ├─ nextjs.svg
      ├─ react.svg
      ├─ postgresql.svg
      ├─ victoriametrics.svg
      ├─ victorialogs.svg
      ├─ redis.svg
      ├─ nginx.svg
      ├─ grafana.svg
      ├─ sentry.svg
      ├─ leaflet.svg
      └─ echarts.svg
```

## 3. Cách lấy ảnh thật từ báo cáo PDF
Nên ưu tiên ảnh ở Chương 4 và Phụ lục:
- Ảnh PCB / bo mạch: dùng cho `assets/images/pcb-layout.png` hoặc `pcb-annotated.jpg`.
- Ảnh bo mạch sau khi lắp: dùng cho `assets/images/assembled-board.jpg`.
- Ảnh thiết bị đóng vỏ: dùng cho `assets/images/device-case.jpg`.
- Ảnh dashboard danh sách thiết bị: dùng cho `assets/images/dashboard-devices.jpg`.
- Ảnh dashboard bản đồ / cảnh báo: dùng cho `assets/images/dashboard-map.jpg`.
- Nếu có ảnh lắp đặt thực tế trên xe ở phụ lục, thay vào một ảnh trong mục 4 hoặc thêm file `installed-in-car.jpg`.

## 4. Cách thay ảnh
Chỉ cần giữ nguyên tên file trong thư mục `assets/images/`.
Ví dụ muốn thay ảnh thiết bị đóng vỏ:
- Xóa hoặc đổi tên file cũ `assets/images/device-case.jpg`.
- Đưa ảnh mới vào cùng thư mục và đặt tên đúng là `device-case.jpg`.
- Mở lại `index.html`.

## 5. Cách lấy icon công nghệ đúng
Khuyến nghị lấy icon chính thức từ một trong các nguồn:
- Simple Icons: https://simpleicons.org/
- Devicon: https://devicon.dev/
- Trang chính thức của từng công nghệ.

Tên icon cần thay:
- GitHub Actions: `github-actions.svg`
- Docker: `docker.svg`
- EMQX: `emqx.svg`
- MQTT: `mqtt.svg`
- Express.js: `express.svg`
- TypeScript: `typescript.svg`
- Next.js: `nextjs.svg`
- React: `react.svg`
- PostgreSQL: `postgresql.svg`
- VictoriaMetrics: `victoriametrics.svg`
- VictoriaLogs: `victorialogs.svg`
- Redis: `redis.svg`
- Nginx: `nginx.svg`
- Grafana: `grafana.svg`
- Sentry: `sentry.svg`
- Leaflet: `leaflet.svg`
- ECharts: `echarts.svg`

Chỉ cần tải SVG đúng tên và thay vào thư mục `assets/icons/`.

## 6. Sửa flow Nginx + TLS
Trong layout này, Nginx + TLS không nằm trong luồng ingest dữ liệu IoT.
Nó được đặt ở lớp truy cập bên ngoài:
- HTTPS Web → Frontend
- HTTPS API → Backend
Luồng thiết bị vẫn là:
Thiết bị → EMQX → MQTT Bridge → CSDL/API → Dashboard.
