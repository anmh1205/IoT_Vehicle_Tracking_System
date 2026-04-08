# Backend UAT incident check (run 24081448447)

## Executive summary
- Backend fail ở run `24081448447` nhiều khả năng là lỗi phụ thuộc tạm thời (EMQX/DNS), chưa có bằng chứng là bug code backend.
- Evidence chính: backend process đã start, nhưng MQTT listener liên tục `getaddrinfo EAI_AGAIN tracking-emqx` rồi `connack timeout`; healthcheck `/health` trả `503` đến khi workflow timeout/fail.
- Các workflow phụ thuộc sau đó đã xanh: EMQX `24081675407`, PostgreSQL `24081675473`, Grafana `24082445118`.

## Evidence ngắn
- Run fail backend:
  - `curl ... /health` lặp lại `503`.
  - log container: `Server started on port 4000`.
  - log container: `MQTT event listener error: getaddrinfo EAI_AGAIN tracking-emqx` -> `connack timeout`.
  - kết thúc: `Healthcheck failed: http://localhost:4000/health`.
- Run mới:
  - EMQX deploy success.
  - PostgreSQL deploy success.
  - Grafana deploy success.
- Hiện chưa có backend run mới sau khi các dependency xanh.

## Verdict
**Chọn (A) — re-run Backend UAT Deploy để xác nhận.**

Lý do: chưa có backend rerun trong trạng thái dependency đã ổn, nên patch code/workflow ngay lúc này là premature.

## Minimal next action
1. Re-run workflow `Backend UAT Deploy` (workflow_dispatch) trên branch `uat`.
2. Nếu pass: kết luận incident cũ là transient dependency readiness/DNS.
3. Nếu fail lại cùng pattern (`EAI_AGAIN tracking-emqx` + `/health` 503): khi đó mới chuyển sang (B).

## Nếu buộc phải patch (chỉ khi rerun vẫn fail)
- File: `/e/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/backend-uat.yml`
- Đoạn: job `deploy-uat` step `Deploy via SSH`, biến `HEALTHCHECK_URL` (line ~144)
- Patch tối thiểu đề xuất: đổi tạm
  - từ: `HEALTHCHECK_URL: http://localhost:4000/health`
  - sang: `HEALTHCHECK_URL: http://localhost:4000/health/live`

Mục tiêu patch này: giảm false-negative deploy gate do dependency external chưa ready ngay thời điểm rollout.

## Unresolved questions
- Chưa có backend rerun sau khi EMQX/PostgreSQL/Grafana đã success, nên chưa thể kết luận 100% đã hết lỗi.