# Context links
- Root currently missing compose: repo root
- Service compose hiện hữu: `iot-vehicle-tracking-system/Tracking_*/docker-compose*.yml`
- Workflow baseline từ phase 01

# Overview
- Priority: P1
- Current status: pending
- Brief: Thêm `docker-compose.yml` root-level tối thiểu để tool auto-setup detect được monorepo, không tác động runtime.

# Key Insights
- Nhiều tool auto setup CI/CD chỉ quét root để nhận diện Docker project.
- Nếu root compose tham gia runtime mặc định sẽ rủi ro xung đột với compose từng service.
- Thiết kế adapter “inert by default” là phù hợp YAGNI/KISS.

# Requirements
- Functional:
  - Có file `E:/anmh1205/IoT_Vehicle_Tracking_System/docker-compose.yml` cho auto-detect.
  - File chứa metadata/adapter service tối thiểu để parse hợp lệ.
- Non-functional:
  - Không bind port, không mount volume nhạy cảm, không tự chạy khi deploy hiện tại.
  - Dễ rollback: xóa 1 file là về trạng thái cũ.

# Architecture
- Root adapter compose chỉ làm “discovery beacon”.
- Dùng profile riêng (ví dụ `autodetect`) và service no-op để tránh chạy mặc định.
- Không tham chiếu trực tiếp compose runtime của từng service để tránh coupling.

# Related code files
- Modify:
  - None (phase này ưu tiên create mới)
- Create:
  - `E:/anmh1205/IoT_Vehicle_Tracking_System/docker-compose.yml`
- Delete:
  - None

# Implementation Steps
1. Tạo root `docker-compose.yml` với cấu trúc parseable, tối thiểu trường cần thiết.
2. Đặt service adapter no-op + profile không active mặc định.
3. Thêm comment trong file mô tả mục đích “auto-detect only, not deployment entrypoint”.
4. Validate bằng `docker compose config` local/CI check (không chạy up).

# Todo list
- [ ] Draft adapter compose minimal.
- [ ] Verify compose syntax hợp lệ.
- [ ] Verify không ảnh hưởng workflow UAT hiện tại.
- [ ] Document rollback one-step.

# Success Criteria
- Tool auto-setup có thể detect Docker project từ root.
- Không xuất hiện container/service mới trong luồng deploy hiện hữu.

# Risk Assessment
- Risk: Tool auto-generate workflow quá rộng. Mitigation: phase 03 harden trigger/path.
- Risk: Team dùng nhầm root compose để deploy. Mitigation: comment cảnh báo + runbook rõ.

# Security Considerations
- Adapter không dùng secrets.
- Không khai báo env credentials ở root compose.

# Next steps
- Sang phase 03 để harden trigger/secret policy cho workflow hiện hữu và workflow auto-generated.
