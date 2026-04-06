# Research Report: Cloud geofence + distance limits

**Timestamp:** 2026-04-05 22:28 (Asia/Saigon)

## Mục tiêu
Nghiên cứu phương án cloud cho 3 giới hạn: (1) ranh giới hành chính tỉnh/thành, (2) bán kính X km từ tâm, (3) tổng quãng đường cho phép X km.

## Executive Summary
Khuyến nghị đơn giản nhất: xử lý policy trên cloud, lưu trạng thái hiện tại theo xe, tính vi phạm bằng state machine, và chỉ dựa vào telemetry đã lọc chất lượng. Với geofence hành chính, nên dùng polygon chuẩn hóa + buffer nhỏ + dwell time để giảm false positive ở biên. Với bán kính, dùng geodesic distance từ tâm; không dùng planimetric distance thô nếu vùng rộng. Với quãng đường, cộng dồn theo từng segment telemetry hợp lệ; reset theo cycle (ngày/tuần/tháng/lifetime) bằng job định kỳ hoặc khi truy vấn policy.

Điểm mấu chốt: GPS ngoài đời không ổn định. Cloud phải chấp nhận độ trễ nhỏ để đổi lấy độ chính xác. Cần hysteresis, dwell, và grace window khi mất GPS. Nếu không, hệ thống sẽ spam violation ở biên hoặc khi tín hiệu rơi.

## Research Methodology
- Sources consulted: 10+ official/vendor docs
- Date range: archived docs + current vendor docs available as of 2026-04
- Key terms: geofence, dwell time, loitering delay, GPS accuracy, hysteresis, lost GPS, geodesic distance, ST_Length, ST_Distance, cumulative distance, telemetry odometer

## Key Findings

### 1) Geofence: hành chính tỉnh/thành
- Nên lưu boundary dạng polygon/multipolygon ở server, không hardcode theo app.
- Dùng point-in-polygon cho telemetry; nếu point nằm sát biên, áp dụng buffer/hysteresis 5–10 m để tránh flicker.
- Android docs nhấn mạnh geofence nhỏ dễ nhiễu; nhiều trường hợp cần radius tối thiểu cỡ 100–150 m và dwell transition để giảm trigger khi xe chỉ lướt qua.[1][2]
- iOS region monitoring cũng có giới hạn thực tế; event có thể bị trễ và không phù hợp cho vùng quá nhỏ.[3]

### 2) Geofence: bán kính X km từ tâm
- Dùng geodesic distance (ellipsoidal/great-circle) từ tâm tới điểm telemetry; đủ cho cloud backend và nhất quán giữa nền tảng.[4][5][6]
- Nếu cần đơn giản, PostGIS `ST_DistanceSpheroid` / `ST_LengthSpheroid` là lựa chọn tốt để tránh sai số lớn trên bản đồ địa lý.[4]
- Với vòng tròn, thêm hysteresis: enter tại R_in, exit tại R_out = R_in + buffer.

### 3) Cumulative distance: tổng quãng đường cho phép X km
- Cách chuẩn: cộng incremental distance giữa 2 telemetry hợp lệ liên tiếp. Không cộng theo “độ lệch so với tâm”; phải là quãng đường đã đi.
- Chỉ tính khi điểm trước/sau đều đạt quality gate: accuracy đủ tốt, timestamp tăng, speed hợp lý, không jump quá xa bất thường.
- Nếu telemetry mất, giữ pending state, không tự cộng đoạn thiếu dữ liệu; chờ điểm mới hợp lệ hoặc đóng đoạn bằng rule rõ ràng.
- Reset cycle: daily/weekly/monthly/lifetime. Dễ nhất là lưu `cycle_start`, `cycle_end`, `consumed_distance_m`, rồi job reset khi sang cycle mới.

### 4) False positives, hysteresis, dwell, lost GPS
- Hysteresis là bắt buộc ở biên để tránh “rung”.
- Dwell time nên dùng cho entry/exit, nhất là hành chính hoặc zone gần biên. Android docs khuyên `loiteringDelay`/dwell để giảm drive-by triggers.[1][2]
- Khi mất GPS: chuyển sang `GPS_SUSPECT` hoặc `NO_FIX`; cho grace window (ví dụ vài phút) trước khi kết luận exit/violation.
- Không suy diễn violation từ một mẫu lỗi đơn lẻ.

## Comparative Analysis

| Phương án | Ưu điểm | Nhược điểm | Khuyến nghị |
|---|---|---|---|
| Boundary polygon | Chính xác cho hành chính | Phức tạp hơn circle | Dùng cho tỉnh/thành |
| Circle geofence | Rất đơn giản | Không hợp ranh giới hành chính | Dùng cho bán kính X km |
| Incremental distance | Đúng bài toán quota | Cần lọc telemetry kỹ | Dùng cho quãng đường cho phép |

## Đề xuất data model chuẩn

### `policy`
- `id`, `type` (`ADMIN_BOUNDARY` / `RADIUS` / `DISTANCE_QUOTA`)
- `scope_ref` (province code, center point, quota config)
- `threshold_m`, `buffer_m`, `dwell_sec`
- `cycle_type` (`DAILY`/`WEEKLY`/`MONTHLY`/`LIFETIME`)
- `effective_from`, `effective_to`, `status`

### `policy_state`
- `vehicle_id`, `policy_id`
- `current_state` (`INSIDE`, `OUTSIDE`, `UNKNOWN`, `GPS_SUSPECT`)
- `last_good_fix_at`, `last_point`, `consumed_distance_m`
- `cycle_id`, `cycle_start_at`, `cycle_end_at`

### `violation_event`
- `vehicle_id`, `policy_id`, `violation_type`
- `detected_at`, `confirmed_at`, `severity`
- `evidence_point_id`, `reason_code`, `raw_payload_hash`

### `audit_event`
- `actor_type` (`SYSTEM`/`OPERATOR`/`SCHEDULED_JOB`)
- `action`, `before_state`, `after_state`, `correlation_id`
- immutable append-only log

## Incremental distance algorithm
1. Sort telemetry by timestamp.
2. Reject points with stale timestamp, impossible speed, or accuracy vượt ngưỡng.
3. For mỗi cặp điểm hợp lệ liên tiếp, tính geodesic segment distance.
4. Cộng segment vào `consumed_distance_m`.
5. Nếu gap quá lớn hoặc GPS suspect, break segment, không nối tắt.
6. Khi `consumed_distance_m >= quota_m`, tạo violation/quota exceeded.

Pseudo-rule:
```text
if valid(prev) and valid(curr) and gap <= max_gap_sec:
  delta = geodesic(prev, curr)
  consumed += delta
```

## Rollout phases
- Phase 1: RADIUS + DISTANCE_QUOTA, server-side only, no auto enforcement.
- Phase 2: ADMIN_BOUNDARY with polygon + buffer + dwell.
- Phase 3: GPS quality scoring, grace windows, audit dashboard.
- Phase 4: optimization/indexing, partition telemetry, backfill historical cycles.

## Trade-offs
- Exactness vs simplicity: polygon + geodesic tốt hơn nhưng tốn xử lý hơn circle.
- Real-time vs false alerts: dwell/grace làm trễ cảnh báo nhưng giảm spam.
- Strict quota vs data loss: nếu GPS mất, nên ưu tiên không cộng sai hơn là cộng thiếu.

## Resources & References

### Official Documentation
- [Android geofencing](https://developer.android.com/develop/sensors-and-location/location/geofencing)
- [Android location scenarios](https://developer.android.com/develop/sensors-and-location/location/battery/scenarios)
- [Apple Region Monitoring](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/LocationAwarenessPG/RegionMonitoring/RegionMonitoring.html)
- [Google Maps JS Geometry](https://developers.google.com/maps/documentation/javascript/geometry)
- [Google Maps iOS GMSGeometryLength](https://developers.google.com/maps/documentation/ios-sdk/reference/objc/Functions/GMSGeometryLength)
- [PostGIS ST_Length](https://postgis.net/docs/en/ST_Length.html)
- [PostGIS ST_Length_Spheroid](https://postgis.net/docs/ST_Length_Spheroid.html)
- [PostGIS ST_Distance_Spheroid](https://postgis.net/docs/ST_Distance_Spheroid.html)
- [Microsoft Bing Maps spatial math](https://learn.microsoft.com/en-us/bingmaps/v8-web-control/modules/spatial-math-module/core-calculations)
- [GeoPy distance docs](https://geopy.readthedocs.io/)

### Vendor/Practical Guidance
- [Levy Fleets zones/hysteresis](https://fleets.levyelectric.com/help/zones/how-zones-work)
- [TrackTik geofencing best practices](https://support.tracktik.com/hc/en-us/articles/30618581168919-Best-Practices-for-using-Geofencing-and-Mobile-App-Restrictions)
- [PiinPoint mobile location data best practices](https://help.piinpoint.com/en/articles/5448814-piinpoint-user-guide-best-practices-for-using-mobile-location-data)

## Unresolved questions
- Ngưỡng GPS accuracy thực tế của fleet hiện tại là bao nhiêu m?
- Có cần đồng bộ boundary theo source hành chính nào (VNPost/ADM/OSM/GeoJSON nội bộ)?
- SLA cảnh báo chậm tối đa được chấp nhận là bao nhiêu giây/phút?
- Policy quota có cần cộng dồn theo engine-running time hay mọi chuyển động xe?
