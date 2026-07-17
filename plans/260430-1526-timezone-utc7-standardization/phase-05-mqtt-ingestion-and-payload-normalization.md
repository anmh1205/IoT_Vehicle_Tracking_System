# Context Links
- researcher-02-device-ingestion-timezone-audit.md
- docs/system-architecture.md

# Overview
- Priority: P1
- Current status: pending
- Brief description: Chuẩn hóa timestamp ngay cổng MQTT ingestion, reject/mark payload mơ hồ.

# Key Insights
- MQTT là canonical ingest path, nên normalize ở đây cho leverage cao nhất.
- Không khóa chặt format sớm sẽ kéo dài lỗi xuống mọi downstream.

# Requirements
- Functional requirements
  - Validate timestamp format/type theo contract, với canonical transport format là **ISO8601 +07:00**.
  - Normalize một lần tại bridge/listener.
  - Gắn cờ payload ambiguous để quan sát và xử lý.
  - Chỉ rõ compatibility policy cho firmware/device cũ nếu chưa gửi được ISO8601 +07:00.

<!-- Updated: Validation Session 1 - canonical MQTT timestamp contract -->
- Non-functional requirements
  - Throughput không giảm đáng kể.
  - Idempotent event processing giữ nguyên.

# Architecture
- System design
  - Ingestion gateway: validator + normalizer + rejection policy.
- Component interactions
  - Bridge -> DB/backend dùng normalized field.
- Data flow
  - raw_time + normalized_time (transition window) -> normalized only.

# Related Code Files
- List of files to modify
  - Tracking_MqttBridge handlers/parsers.
  - Backend MQTT listener liên quan realtime.
- List of files to create
  - Payload contract examples + invalid cases catalog.
- List of files to delete
  - None.

# Implementation Steps
1. Define accepted timestamp variants (strict list).
2. Implement normalize/reject policy với error codes rõ.
3. Add anomaly counters: missing/ambiguous/out-of-range timestamps.
4. Remove transition compatibility sau khi data sạch.

# Todo List
- [ ] Validator + normalizer design approved.
- [ ] Transition metrics defined.
- [ ] Backward compatibility window scoped.

# Success Criteria
- Không còn payload timestamp mơ hồ vào DB core tables.

# Risk Assessment
- Potential issues: reject nhiều payload cũ từ firmware legacy.
- Mitigation strategies: allowlisted temporary compatibility with telemetry alerts + deadline.

# Security Considerations
- Auth/authorization: giữ nguyên ACL topic, không mở rộng quyền ingest.
- Data protection: sanitize logs khi ghi payload lỗi.

# Next Steps
- Dependencies: Phase 02.
- Follow-up tasks: Phase 06, Phase 09.