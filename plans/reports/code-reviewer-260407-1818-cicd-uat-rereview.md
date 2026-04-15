## Code Review Summary

### Scope
- Files:
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/scripts/deploy/deploy-service.sh`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/backend-uat.yml`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/postgresql-uat.yml`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/emqx-uat.yml`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/grafana-uat.yml`
  - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/mobile-uat.yml`
- LOC diff: ~164 lines changed (153 add, 11 delete)
- Focus: re-review các thay đổi mới cho CI/CD UAT
- Scout findings:
  - `deploy-service.sh` còn được dùng bởi `frontend-uat.yml` và `mqtt-bridge-uat.yml` (điểm phụ thuộc cần theo dõi khi đổi healthcheck behavior).
  - Không thấy state mutation/race trong script shell; có rủi ro boundary ở health-gate thông số/credential parsing.

### Overall Assessment
Bản vá đã cải thiện rõ reliability (concurrency groups, workflow_dispatch, health-gate, kiểm tra secret bắt buộc, test backend bắt buộc). Không phát hiện issue mức **critical/high** trong phạm vi file được yêu cầu. Còn một số điểm **medium/low** liên quan false-negative health gate và độ bền pipeline notifications.

### Critical Issues
- Không phát hiện.

### High Priority
- Không phát hiện.

### Medium Priority
1. **Discord webhook có thể làm fail pipeline dù deploy/build thành công**
   - File:line:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/postgresql-uat.yml:73-79`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/emqx-uat.yml:75-81`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/grafana-uat.yml:73-79`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/mobile-uat.yml:53-59,84-90`
   - Impact: nếu `DISCORD_WEBHOOK_URL` thiếu/sai, job có thể bị đánh fail sau khi deploy/build thành công (noise, false-red CI).
   - Fix ngắn gọn: áp dụng pattern đã dùng ở backend (`if: always() && env.DISCORD_WEBHOOK_URL != ''` + `continue-on-error: true` + bind secret qua `env`).

2. **PostgreSQL health-gate có thể false negative khi project dùng credential/db name khác mặc định**
   - File:line: `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/postgresql-uat.yml:65`
   - Impact: `pg_isready` dùng `${POSTGRES_USER:-postgres}` / `${POSTGRES_DB:-vehicle_tracking}` từ shell host; nếu khác cấu hình container thật có thể fail dù DB đã healthy.
   - Fix ngắn gọn: lấy user/db trực tiếp từ env file compose (hoặc `docker compose exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`).

3. **EMQX health-gate parse password từ `.env` theo cách dễ vỡ với format đặc biệt**
   - File:line: `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/emqx-uat.yml:64-67`
   - Impact: nếu password có quote/ký tự đặc biệt/comment pattern, lệnh `grep|cut` có thể parse sai, dẫn tới fail health-gate giả.
   - Fix ngắn gọn: parse bằng shell-safe method (source env file có kiểm soát) hoặc inject credential qua secret/env rõ ràng cho bước healthcheck.

### Low Priority
1. **Validation step đặt sau SCP làm giảm chất lượng fail-fast**
   - File:line:
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/postgresql-uat.yml:21-32`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/emqx-uat.yml:21-32`
     - `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/grafana-uat.yml:21-32`
   - Impact: thiếu secret SSH thì fail ngay tại SCP step trước khi vào bước validate custom message.
   - Fix ngắn gọn: chuyển `Validate required deploy secrets` lên trước các bước SCP/SSH.

2. **Thiếu `timeout-minutes` ở các job deploy/build**
   - File:line: các job trong 5 workflow `.github/workflows/*-uat.yml`
   - Impact: khi remote treo/network lỗi, runner có thể giữ lâu hơn cần thiết.
   - Fix ngắn gọn: đặt timeout hợp lý theo loại job (ví dụ deploy 15-20m, mobile build 30-45m).

### Edge Cases Found by Scout
- `deploy-service.sh` hiện được tái sử dụng bởi workflows ngoài phạm vi review (`frontend-uat.yml`, `mqtt-bridge-uat.yml`). Dù backward-compatible (default required_successes=1), nên đồng bộ health-gate policy để tránh behavior lệch giữa services.
- Health endpoint có thể chập chờn sau restart: cơ chế consecutive success trong `deploy-service.sh` là cải tiến tốt, giảm false-green.

### Positive Observations
- Backend đã bỏ `npm test --if-present` sang `npm test` (siết quality gate).
- Bổ sung `workflow_dispatch` + `concurrency` cho UAT workflows (giảm overlap deploy).
- Thêm loop health checks + log tail khi fail (tăng observability).
- Bổ sung validation secret bắt buộc cho deploy path (giảm lỗi cấu hình mơ hồ).

### Recommended Actions
1. Chuẩn hóa Discord step theo backend pattern cho tất cả workflows còn lại.
2. Cứng hóa PostgreSQL và EMQX health-gate để tránh false-negative do parse/env mismatch.
3. Chuyển validate secret lên đầu pipeline và thêm `timeout-minutes`.

### Metrics
- Type Coverage: N/A (workflow/shell scope)
- Test Coverage: N/A (không chạy test trong review này)
- Linting Issues: N/A (không chạy lint trong review này)

### Readiness for Pilot UAT
- **Kết luận:** **Ready có điều kiện**.
- Với phạm vi thay đổi hiện tại, không còn critical/high blocker. Có thể pilot UAT sau khi team chấp nhận rủi ro medium ở notification + health-gate parsing/mismatch (hoặc vá nhanh các điểm này trước rollout để giảm false-red).

### Unresolved Questions
- Trong môi trường UAT thực tế, PostgreSQL có dùng `POSTGRES_USER/POSTGRES_DB` khác default không?
- Password EMQX trong `.env` có format quote/ký tự đặc biệt không?
- Team có chủ đích để Discord notification fail job khi webhook lỗi, hay chỉ cần best-effort thông báo?
