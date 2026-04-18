# Audit V1 Checklist

Ngay tao: 2026-04-18
Nguon: `resources/docs/audit-v1.pdf`
Muc tieu: chot backlog sua source + seed local Docker + test UI/UX bang anh

## 1. Lien ket du lieu cot loi
- [ ] Dong bo luong gan `device <-> vehicle <-> customer`
- [ ] Kiem tra va bo sung luong gan `vehicle <-> driver`
- [ ] Sua dashboard "Canh bao gan day" lay dung nguon alert
- [x] Seed local data co quan he logic cho customer, driver, vehicle, trip, geofence, maintenance

## 2. Van hanh / Ban do
- [ ] Bo the thong tin thiet bi trung lap o sidebar khi da co overlay tren map
- [ ] Click vao thiet bi se focus tuong duong "Theo doi xe"
- [ ] Overlay duoi map hien thi: toc do, tua may, pin, ac quy, nhiet do may, toa do, thoi gian cap nhat
- [ ] Icon canh bao cuoi overlay doi mau do khi co loi va co tooltip dien giai
- [ ] Dong bo kich thuoc nut thao tac map voi bo chuyen lop ban do
- [ ] Marker thiet bi hien thi theo hinh xe phu hop

## 3. Vung giam sat
- [ ] Lam lai UI/UX tao geofence de khong tran text
- [ ] Ban kinh hien thi/chinh sua theo km
- [ ] Thanh keo toi uu de chinh de trong khoang 1-500 km
- [ ] Ho tro cham tren map de chon tam
- [ ] Don gian hoa luong "tao vung tu xe dang chon"

## 4. Chuyen di
- [ ] Doi chieu trip list voi data thuc te
- [ ] Tich hop replay/map vao modal hoac bo cuc hop ly hon

## 5. Device Detail Modal
- [x] Them tooltip giai thich thong so o tab tong quan
- [x] Bo bieu do runtime gan day neu khong con gia tri
- [ ] Gop "lo trinh" va "phien chay" vao cau truc de hieu hon
- [x] Tach ro pin thiet bi / ac quy xe / nhiet do dong co
- [x] Hien thi dung firmware, bien so, khach hang
- [ ] Sua cach hien thi chu ky cau hinh va kiem tra flow cloud -> firmware
- [x] Doi ngu "do tuoi ban tin", "nhip quan sat", readiness/catalyst sang tieng Viet ro nghia
- [ ] Tang dien tich map, giam cuon, nghien cuu bo cuc modal moi
- [x] Tab ma loi va lenh phai co data va hoat dong
- [x] Tab ban ghi/raw data hien thi dang matrix co ma, giai thich, gia tri
- [ ] Tab cai dat ho tro cau hinh tach theo driving / parking / alert va end-to-end

## 6. Fleet Pages
- [ ] Audit va sua phuong tien
- [ ] Audit va sua tai xe
- [ ] Audit va sua khach hang
- [ ] Them nguc canh xe/thiet bi/khach hang tren cac man lien quan

## 7. Alerts / Notifications / Maintenance
- [ ] Alert list hien thi duoc cua thiet bi nao, xe nao
- [ ] Modal alert detail du rong, bo cuc lai, Viet hoa thong diep, co goi y xu ly
- [x] Notification hien thi duoc nguon thiet bi/xe
- [ ] Persist read/hide notification vao PostgreSQL
- [ ] Them kenh Discord / Telegram tren settings + luu DB
- [ ] Bao tri: hoan thien schema, CRUD, relation voi vehicle/alert, va UI/UX

## 8. System Pages
- [x] System status hien thi day du hon cho backend, PostgreSQL, EMQX, MQTT bridge, VictoriaMetrics, VictoriaLogs, Grafana
- [x] System admin co tab metrics hop ly
- [x] Co trang xem/quan tri PostgreSQL dung contract
- [ ] Hoan thien UI/UX va use case quan tri

## 9. Firmware Page
- [ ] Tai thiet ke trang firmware
- [ ] Co du ngu canh version/device/deployment
- [ ] Kiem tra upload/deploy/history/log hoat dong dung voi data

## 10. Xac minh
- [x] Chay backend build/test
- [x] Chay frontend build/typecheck
- [x] Chup anh local Docker sau khi fix
- [x] Doi chieu UI voi API/data thuc
- [x] Ghi lai cac muc con ton dong neu co

## 11. Vong doi chieu 2026-04-19 01:05
- [x] Re-verify local Docker bang anh moi: `local-system-status-v5.png`, `local-system-admin-metrics-cpu-v4.png`, `local-system-admin-metrics-memory-v4.png`, `metrics-page-v6.png`, `local-device-bus-tracker-002-overview-20260419-v3-shell.png`, `local-device-bus-tracker-002-dtc-20260419-v3-shell.png`, `local-device-bus-tracker-002-raw-20260419-v3-shell.png`, `local-settings-notifications-v4.png`
- [x] API local co auth khop voi UI cho system health, metrics, device detail, DTC, notifications
- [x] Da xoa canh bao Recharts `width(-1)` / `height(-1)` tren trang metrics trong vong verify `metrics-page-v6.png`
- [ ] Cac nhom map, geofence, trips, fleet pages, firmware page, maintenance va use-case end-to-end rong hon van can re-audit ky hon neu muon chot toan bo PDF
