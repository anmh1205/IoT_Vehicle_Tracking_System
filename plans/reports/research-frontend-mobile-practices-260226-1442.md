# Nghiên cứu: Thực tiễn Next.js frontend + Flutter mobile trong tracking thời gian thực

## Mục tiêu
- Xác định chính sách bảo mật/phiên, UX tải lỗi, hiệu năng bản đồ, xử lý MQTT/WebSocket, dự phòng offline và quản lý secrets trong stack Next.js + Flutter.
- Gợi ý cải tiến nhẹ phù hợp YAGNI/KISS/DRY.

## Key insights

### 1. Authentication & session management ở Next.js
- Dùng Server Actions để xử lý login/signup (xác thực, validation, hash) và tạo session (JWT/id) ngay trên server, tránh lộ logic cho client và đảm bảo cookie `HttpOnly|Secure|SameSite` với max-age rõ ràng. ([Next.js auth guide](https://nextjs.org/docs/app/guides/authentication))
- Triển khai `proxy.ts` (middleware) chỉ cho việc đọc cookie để redirect nền, tránh fetch DB chậm; đặt `matcher` hợp lý để giới hạn phạm vi và giữ logic nặng trong DAL/Server Actions gần nguồn dữ liệu hơn. ([Next.js auth guide](https://nextjs.org/docs/app/guides/authentication))
- Tạo DAL/DTO trung tâm: `verifySession()` cached, `getUser()` chỉ trả các trường cần thiết, đồng bộ token cập nhật trong Server Components/Route Handlers để tránh re-render thừa và giữ bảo mật. ([Next.js auth guide](https://nextjs.org/docs/app/guides/authentication))

### 2. Map rendering & dashboard UX
- Vercel BFCM dashboard: gom polling ngắn (10s) + ISR revalidate (5s) để giữ dữ liệu gần thời gian thực mà vẫn tận dụng CDN, giảm tải cho backend, đồng thời dùng React Server Components để render metric/phần map server-side, giảm số API call từ client. Tăng perceived performance bằng animation/tăng dần value để tránh nhấp nhô. ([Vercel BFCM dashboard](https://vercel.com/blog/building-the-black-friday-cyber-monday-live-dashboard?utm_source=openai))
- Tải bản đồ/charts lazy (`next/dynamic({ssr:false})`) để thu gọn bundle, thêm skeleton hoặc placeholder trong thời gian fetching để UX không bị đơ.

### 3. API error/loading states
- Khi dùng Server Components + Server Actions, chuyển hướng logic lỗi xuống server để UI client chỉ cần render `null`/placeholder. Kết hợp `useActionState` để hiển thị real-time validation errors và disable nút gửi trong lúc pending, tránh double submission. (kết hợp từ Next.js auth guide)
- Bỏ bớt state phức tạp: dùng `pending`/`state.errors` thay vì giữ store toàn cục; giữ error display cạnh form, không context/Redux.

### 4. MQTT/WebSocket / real-time state (Flutter)
- Treat socket như resource có lifecycle: connect/disconnect rõ ràng, emit `authenticate`, join room, lắng nghe `userOnline`/`typing` events, và cleanup listener trước khi rời screen để tránh leak. Hiển thị trạng thái kết nối (`Connecting…`, `Reconnecting…`). ([Dev.to real-time chat](https://dev.to/mikeodnis/building-a-real-time-chat-app-with-websockets-3k6f?utm_source=openai))
- Kết hợp heartbeat/ping (khoảng 30s) và reconnection/backoff để phát hiện dead peer, với số lần cố gắng và reset counter sau khi thành công. ([Dev.to WebSocket best practices](https://dev.to/oathooh/how-to-implement-websockets-for-real-time-communication-5gn9?utm_source=openai))

### 5. Offline queue & retry strategy (Flutter)
- Dùng SQLite/Drift như hàng đợi mutation: lưu operation với trạng thái (`pending`, `synced`, `failed`) và metadata `revision`, `timestamp`. Khi mạng trở lại, upload hàng đợi trước rồi download delta (`revision > last_revision_synced`), merge, update metadata. ([Program Tom offline-first](https://programtom.com/dev/2025/11/22/offline-first-mobile-app-database-sync/amp/?utm_source=openai))
- Kết hợp listener `connectivity_plus` để restart sync service khi online, đồng thời dùng background job (WorkManager, background_fetch) để xử lý queue định kỳ.

### 6. Secrets management (Flutter)
- Tuyệt đối không hardcode API key/secret trong binary; giữ secrets trên backend, cung cấp token ngắn hạn khi client cần kết nối MQTT/WebSocket. Dùng `flutter_secure_storage` kết hợp khóa release và refresh token: kiểm thử build release để đảm bảo behavior giống debug. ([Flutter Experts security 2025](https://flutterexperts.com/flutter-security-2025-the-definitive-guide-to-protecting-mobile-apps/?utm_source=openai))
- Kết hợp `local_auth`/MFA trước khi truy xuất secure storage và rotate credential định kỳ.

## Lightweight suggestions (YAGNI/KISS/DRY)
- Tối giản logic: giữ each Next.js page server-rendered (`cache`), tránh Redux lượt đi/đến; share DAL functions, DTO definitions thay vì copy-paste.
- Flutter: dùng small helper (service) quản lý queue/retry, reuse heartbeat/backoff across screens, không lặp code kết nối.
- Bỏ các tính năng chưa dùng (ví dụ analytics thừa) cho giai đoạn MVP.

## Unresolved questions
- Không có.
