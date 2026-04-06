## Code Review Summary

### Scope
- Files:
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/geofence-crud.service.ts`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/vehicle-policy-crud.service.ts`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/controllers/geofence.controller.ts`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/shared/utils/geo.util.ts`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/policy-evaluator.service.ts`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/validators/geofence.validator.ts`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/repositories/vehicle-policy-violation.repository.ts`
- LOC reviewed: ~1632
- Focus: recent backend geofence policy changes
- Scout findings: concentrated on data-flow from IoT ingest → policy evaluator → state/violation repositories; checked boundary/time-window/race conditions and API-query consistency

### Overall Assessment
Luồng chính đã rõ, có tách service/repository hợp lý, có metric + dedupe + graceful-fail khi evaluate lỗi. Tuy nhiên còn một số điểm high về race condition và tính đúng dữ liệu truy vấn trạng thái vi phạm.

### Critical Issues
- Không thấy lỗi mức Critical trong phạm vi đã review.

### High Priority
1. **Race condition khi tạo violation theo dedupe key (có thể nổ unique violation thay vì idempotent)**  
   - File: `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/repositories/vehicle-policy-violation.repository.ts:82-116`  
   - Vấn đề: code `SELECT by dedupe_key` rồi `INSERT` tách rời. 2 request đồng thời cùng dedupeKey có thể cùng không thấy record rồi cùng INSERT; một request dính unique index error.  
   - Tác động: ingestion/evaluation có thể fail cục bộ theo tải cao, mất tính idempotent kỳ vọng.  
   - Khuyến nghị: dùng 1 câu lệnh `INSERT ... ON CONFLICT (dedupe_key) DO UPDATE/DO NOTHING RETURNING ...` để atomic.

2. **Race condition tích lũy quota distance do read-modify-write không khóa**  
   - File: `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/policy-evaluator.service.ts:223-241, 410-435`  
   - Vấn đề: lấy state hiện tại, cộng thêm segment distance rồi upsert. Nếu có ingest song song cho cùng vehicle/policy, consumed_m có thể bị ghi đè/lệch.  
   - Tác động: quota bị undercount/overcount, trigger EXCEEDED sai thời điểm.  
   - Khuyến nghị: transaction + row lock (`SELECT ... FOR UPDATE`) hoặc cập nhật cộng dồn atomically ở DB theo timestamp guard.

### Medium Priority
1. **Query param `acknowledged` được validate nhưng không được áp dụng khi query violations**  
   - File:  
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/validators/geofence.validator.ts:97-104`  
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/repositories/vehicle-policy-violation.repository.ts:18-31`  
   - Vấn đề: schema nhận `acknowledged`, nhưng repository không filter theo trường này.  
   - Tác động: API trả dữ liệu không đúng kỳ vọng client khi truyền filter `acknowledged`.  
   - Khuyến nghị: thêm điều kiện WHERE theo acknowledged hoặc bỏ param khỏi contract.

2. **Contract `auto_resolved` không nhất quán với dữ liệu trả về**  
   - File:  
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/api/validators/geofence.validator.ts:102`  
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/repositories/vehicle-policy-violation.repository.ts:27-29, 47-51`  
   - Vấn đề: query cho phép `auto_resolved`, nhưng khi filter bị map về `resolved`, và status trả ra cũng chỉ open/acknowledged/resolved.  
   - Tác động: client không thể phân biệt `resolved` thủ công vs `auto_resolved`.  
   - Khuyến nghị: hoặc support cờ phân biệt trong SQL/status mapping, hoặc loại `auto_resolved` khỏi schema/type public.

3. **Thiếu validate timestamp thiết bị trước khi dùng Date/toISOString**  
   - File: `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts:38-39, 109, 154`  
   - Vấn đề: `payload.timestamp` không được kiểm tra hợp lệ; giá trị NaN/invalid có thể dẫn tới `RangeError: Invalid time value` khi `toISOString()`.  
   - Tác động: request ingestion 500 không cần thiết (input xấu).  
   - Khuyến nghị: validate finite timestamp (epoch ms hợp lệ), fallback server time hoặc reject 400 rõ ràng.

### Low Priority
1. **Trùng lặp logic policy CRUD giữa 2 service (DRY vi phạm, tăng rủi ro lệch behavior)**  
   - File:  
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/geofence-crud.service.ts:129-275`  
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/vehicle-policy-crud.service.ts:17-162`  
   - Vấn đề: phần sanitize/list/get/create/update policy gần như duplicate.  
   - Tác động: sửa 1 nơi dễ quên nơi còn lại.  
   - Khuyến nghị: giữ 1 nguồn sự thật (single service/helper dùng chung).

2. **Kích thước file vượt guideline nội bộ (<200 lines)**  
   - File:  
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/policy-evaluator.service.ts` (~448 lines)  
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/geofence/services/geofence-crud.service.ts` (~275 lines)  
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-cloud/Tracking_Backend/src/domain/iot/services/iot-ingestion.service.ts` (~212 lines)  
   - Vấn đề: khó maintain/test theo module nhỏ.

### Edge Cases Found by Scout
- Concurrent telemetry cho cùng vehicle trong cùng khoảng thời gian gây lệch quota do update state không atomic.
- Concurrent violation creation cùng dedupeKey gây unique conflict thay vì idempotent return.
- Boundary filter param (`acknowledged`, `auto_resolved`) không phản ánh đúng backend semantics.
- Invalid device timestamp có thể làm hỏng ingestion dù payload khác hợp lệ.

### Positive Observations
- Có separation tốt giữa controller/service/repository.
- Dùng parameterized SQL, giảm rủi ro injection.
- Có metrics (`policyEvalDurationSeconds`, counters) và logging theo context.
- `iot-ingestion` bắt lỗi evaluate policy để không chặn luồng ingest chính (resilience hợp lý).

### Recommended Actions
1. Sửa atomic upsert cho violation dedupe (ưu tiên cao nhất).
2. Chặn race cho distance quota state update (transaction/locking/atomic DB update).
3. Đồng bộ contract query violations (`acknowledged`, `auto_resolved`) với logic SQL và kiểu trả về.
4. Validate `payload.timestamp` trước mọi `toISOString()`.
5. Refactor gộp logic policy CRUD trùng lặp.

### Metrics
- Type Coverage: N/A (không đo trực tiếp trong phiên này)
- Test Coverage: N/A (không chạy lại; theo ngữ cảnh user: test/build/lint/typecheck đang pass)
- Linting Issues: N/A (không chạy lại; theo ngữ cảnh user: pass)

### Unresolved Questions
- `auto_resolved` có requirement nghiệp vụ thật sự không, hay chỉ tương thích dữ liệu cũ?
- Với DISTANCE_QUOTA, hệ thống có chấp nhận eventual consistency nhẹ hay cần strong consistency tuyệt đối theo vehicle/policy?
