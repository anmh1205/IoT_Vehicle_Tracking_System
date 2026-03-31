# Phase 02 — Build split layout shell

## Mục tiêu
Dựng khung trang `/login` dạng split: landing trái (branding/value), form phải (auth action), hỗ trợ responsive tốt.

## Files tác động
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/login/page.tsx`
- `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/features/auth/components/login-form.tsx` (chỉ điều chỉnh container class nếu cần)

## Step thực thi
1. Đổi `main` layout từ centered-card sang grid/flex 2 cột cho breakpoint desktop.
2. Cột trái: thêm block landing gồm title, subtitle, bullet lợi ích, trust cue ngắn.
3. Cột phải: giữ card login làm trọng tâm, max-width hợp lý, spacing ổn định.
4. Mobile-first: dưới md/sm collapse về 1 cột; landing chuyển lên trên form hoặc ẩn bớt nội dung phụ.
5. Đảm bảo semantics/a11y: heading hierarchy, focus order tự nhiên, contrast đủ.

## Tiêu chí done
- Desktop (>=1024px): nhìn rõ split 2 cột, cân bằng thị giác.
- Tablet/mobile: không vỡ layout, không overflow ngang.
- Không thay đổi props/behavior của submit login.

## Rủi ro
- Over-design làm giảm tốc độ đọc form đăng nhập.
- Layout shift do chiều cao nội dung landing không ổn định.
- Responsive edge case tại breakpoint trung gian (768-1024px).
