# Timezone audit: backend/frontend/database/cron/report

Date: 2026-04-30 15:26 Asia/Saigon
Scope: repo-wide quick audit, focus backend/frontend/database/cron/report timezone surfaces.
Method: grep toàn repo + grep trọng tâm cloud stack. Reconstructed from researcher output.

## 1) Files/surfaces found

### Database / schema surfaces
- `iot-vehicle-tracking-system-cloud/Tracking_PostgreSQL/scripts/uat-runtime-schema-sync.sql`
  - Nhiều cột `TIMESTAMPTZ`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`.
- SQL dump/report dưới `resources/reports/db-sync/...`
  - Xuất hiện dày đặc `timestamp with time zone`.

### App / render / scheduler surfaces
- Cloud stack có bề mặt `cron|schedule|Date|toISOString|toLocale*` trong backend/frontend/report paths.
- `Tracking_Frontend` đã có formatter dùng chung ở `src/lib/utils/date/format.ts` theo docs summary.
- Realtime/dashboard/report surfaces phụ thuộc các formatter và API payload time fields.

## 2) Current timezone assumptions

1. **DB nghiêng UTC-safe**
   - `TIMESTAMPTZ` lưu absolute time, render phụ thuộc session timezone.
   - `NOW()` trả theo session timezone khi hiển thị, nhưng storage model vẫn timezone-aware.

2. **Node/Nest + frontend khả năng đang trộn nhiều kiểu time handling**
   - ISO UTC (`toISOString`) ở transport/storage paths.
   - `toLocaleString()` / formatter local ở UI/report paths.
   - Cron khả năng phụ thuộc process/container TZ nếu chưa set explicit.

## 3) Likely breakpoints when moving to Asia/Ho_Chi_Minh

1. **Cron / scheduler**
   - Job định nghĩa theo wall-clock có thể chạy lệch nếu runtime vẫn UTC.

2. **Query theo ngày / grouping theo ngày**
   - `date_trunc('day', ...)`, filter “today”, “from-to date” dễ lệch biên ngày giữa UTC và UTC+7.

3. **Report / export / analytics**
   - CSV/XLS/PDF/API summary có thể khác UI nếu mỗi chỗ format timezone khác nhau.

4. **Frontend rendering**
   - `new Date(string)` + `toLocaleString()` phụ thuộc browser locale/TZ, dễ lệch giữa client machines.

5. **Server-DB boundary**
   - Nếu code parse naive datetime string hoặc cast sang `timestamp` không timezone, có thể bị shift +7/-7.

## 4) Recommended migration sequencing

1. **Chốt policy canonical trước**
   - Event/storage time: UTC absolute.
   - Business-local day boundary / display / cron wall-clock: `Asia/Ho_Chi_Minh`.

2. **Chuẩn hóa runtime TZ**
   - Set explicit `TZ=Asia/Ho_Chi_Minh` cho service cần business-local cron/day boundary.
   - Set DB/session timezone explicit cho reporting/query paths nếu cần.

3. **Chuẩn hóa parsing/formatting layer**
   - Backend/frontend dùng utility thống nhất để parse UTC, render UTC+7.
   - Cấm naive local datetime strings không offset.

4. **Fix scheduler trước**
   - Mọi cron jobs cần timezone explicit trong scheduler config.

5. **Fix query/report theo ngày**
   - Dùng boundary UTC+7 rõ ràng (`AT TIME ZONE 'Asia/Ho_Chi_Minh'` hoặc tương đương) trước khi group/filter.

6. **Fix frontend display**
   - Dùng 1 formatter thống nhất, tránh double conversion.

7. **Regression checklist**
   - Test case sát nửa đêm UTC/UTC+7, cuối tháng, export/UI/DB đối soát.

## Unresolved questions
1. Có bao nhiêu cron jobs hiện đang dùng local wall time?
2. Những API/report nào đang nhận/trả naive datetime string thay vì ISO8601 offset-aware?
3. User muốn full local-time runtime semantics ở mọi lớp, hay UTC canonical + UTC+7 business/display là đủ để đáp ứng yêu cầu?
