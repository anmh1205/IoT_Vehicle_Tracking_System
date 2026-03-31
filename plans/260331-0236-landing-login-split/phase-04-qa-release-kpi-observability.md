# Phase 04 — QA gate + KPI observability

## Mục tiêu
Chốt quality gate trước merge và thiết lập cách đo hiệu quả sau release cho riêng trang `/login`.

## Files tác động
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/login/page.tsx` (final polish nếu phát hiện issue)
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/auth/components/login-form.tsx` (final polish nếu phát hiện issue)
- `docs/project-changelog.md` (ghi nhận thay đổi UI login sau khi implementation hoàn tất)

## Step thực thi
1. Chạy gate frontend: `lint`, `typecheck`, `build`.
2. Manual QA matrix: desktop/tablet/mobile, dark-light mode (nếu có), slow network.
3. Regression QA: submit thành công, 401 sai mật khẩu, mất mạng, session-expired redirect.
4. Chốt baseline-vs-post metrics từ analytics/log hiện có (không thêm hệ đo mới nếu chưa cần).
5. Soạn release note ngắn: mục tiêu UX, không đổi auth contract, KPI theo dõi 7-14 ngày.

## Tiêu chí done
- Gate kỹ thuật pass 100%.
- Không có blocker về login flow hoặc accessibility nghiêm trọng.
- KPI dashboard/query có thể theo dõi được ngay sau release.

## Rủi ro
- Thiếu event/metric hiện hữu để đo time-to-submit chính xác.
- Chỉ số bị nhiễu do traffic thấp hoặc thay đổi song song từ chiến dịch khác.
- Team bỏ qua theo dõi hậu release, không đóng vòng học tập.
