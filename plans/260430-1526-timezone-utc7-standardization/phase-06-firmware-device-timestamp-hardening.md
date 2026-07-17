# Context Links
- researcher-02-device-ingestion-timezone-audit.md
- resources/docs/firmware-coding-bug-audit-2026-04-24.md

# Overview
- Priority: P1
- Current status: pending
- Brief description: Khóa chặt timestamp logic firmware/device theo UTC epoch, loại bỏ local-time ambiguity.

# Key Insights
- GNSS UTC parse qua local-sensitive conversion là điểm rủi ro chính.
- Device nên giữ UTC nội bộ; UTC+7 chỉ cho hiển thị/debug.

# Requirements
- Functional requirements
  - Xác minh và chuẩn hóa GNSS/NTP/SNTP -> epoch conversion path.
  - Chốt payload timestamp field chuẩn từ firmware.
- Non-functional requirements
  - Không tăng độ phức tạp firmware không cần thiết.
  - Không ảnh hưởng duty cycle/power profile.

# Architecture
- System design
  - Device time subsystem: UTC source -> UTC epoch state -> publish canonical timestamp.
- Component interactions
  - Firmware publish contract đồng bộ ingestion validator.
- Data flow
  - GNSS/NTP sync -> monotonic checks -> payload timestamp.

# Related Code Files
- List of files to modify
  - Firmware time conversion modules và MQTT publish builders.
- List of files to create
  - Firmware timezone regression test checklist.
- List of files to delete
  - None.

# Implementation Steps
1. Audit function-level conversion APIs (mktime/timegm tương đương).
2. Chuẩn hóa converter timezone-agnostic cho UTC input.
3. Đồng bộ payload timestamp contract với bridge/backend.
4. Verify end-to-end ordering/freshness logic với data cận nửa đêm.

# Todo List
- [ ] Conversion path audit complete.
- [ ] UTC-safe conversion enforced.
- [ ] Payload contract compatibility verified.

# Success Criteria
- Firmware không phát sinh shift +7/-7 do timezone runtime.

# Risk Assessment
- Potential issues: thiết bị legacy không update firmware ngay.
- Mitigation strategies: bridge compatibility window + deprecation deadline.

# Security Considerations
- Auth/authorization: giữ nguyên auth MQTT hiện tại.
- Data protection: không đưa secret vào firmware debug logs.

# Next Steps
- Dependencies: Phase 02, Phase 05.
- Follow-up tasks: Phase 09.