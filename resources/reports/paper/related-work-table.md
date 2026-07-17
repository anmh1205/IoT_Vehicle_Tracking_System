# Bảng so sánh Related Work

> 8 baseline × 5 cột novelty. ✓ = có, ✗ = không, ~ = một phần.
> Nguồn: đọc abstract (Crossref, Semantic Scholar) và đối chiếu với codebase đã verify.

## So sánh

| Paper | Venue | Year | Offline queue / Resilience | Edge fusion multi-sensor | OBD diagnostics real-time | Stream processing tại ingest | Evaluation thực tế |
|---|---|---|---|---|---|---|---|
| C-ITS Architecture (Rocha) | Sensors | 2023 | ✗ | ✗ (single sensor) | ✗ | ✗ (MQTT→DB) | ✓ (báo cáo) |
| Fleet Management (Farahpoor) | IEEE Access | 2024 | ✗ | ✗ | ✗ | ✗ (MQTT→DB) | ~ (benchmark) |
| OBD-II Diagnostics (Rimpas) | Energy Reports | 2020 | ✗ | ✗ | ✗ (local only) | ✗ | ✓ (OBD data) |
| Eco-driving OBD+ML (Yen) | Applied Sciences | 2021 | ✗ | ✗ (OBD only) | ~ (post-processing) | ✗ | ✓ (OBD dataset) |
| MQTT vs HTTP power (Jara Ochoa) | Sensors | 2023 | ✗ | ✗ | ✗ | ✗ | ✓ (power) |
| MQTT/CoAP evaluation (Seoane) | Computer Networks | 2021 | ✗ | ✗ | ✗ | ✗ | ✓ (latency) |
| IMU driving behavior | Sensors | 2020 | ✗ | ✗ (IMU only) | ✗ | ✗ | ✓ (IMU data) |
| Accelerometer parked car (Borecki) | Sensors | 2020 | ✗ | ✗ (accel only) | ✗ | ✗ | ✓ (accel data) |
| **This work** | — | — | **✓** | **✓** | **✓** | **✓** | **✓** |

## Phân tích

- **Offline queue**: không baseline nào có store-and-forward QoS-aware cho vehicular. Tất cả đều publish trực tiếp, mất sóng = mất dữ liệu.
- **Edge fusion**: các baseline chỉ dùng 1 cảm biến (OBD hoặc IMU hoặc GPS). Không có multi-evidence anti-flap fusion.
- **OBD diagnostics real-time**: OBD papers (Rimpas, Yen) xử lý sau, không real-time. Paper telematics khác không có OBD diagnostics.
- **Stream processing tại ingest**: tất cả baseline dùng MQTT→DB→query. Không có rule engine tại MQTT subscriber.
- **Evaluation thực tế**: các baseline có evaluation nhưng không full-stack (chỉ 1 tầng). This work có hardware + firmware + cloud + ECU sim.
