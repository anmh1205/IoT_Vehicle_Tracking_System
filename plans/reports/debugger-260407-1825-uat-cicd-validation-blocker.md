# Debugger Report — UAT CI/CD validation blocker

## Executive summary
- Blocker chính: môi trường local thiếu toàn bộ parser/linter YAML machine-level (`actionlint`, `yamllint`, `yq`, `PyYAML`, `ruby Psych`).
- Hệ quả: không thể kết luận hợp lệ YAML bằng parser tại local.
- Khả thi ngay, không cài thêm dependency: dùng GitHub Actions parser thực tế qua `gh workflow run` + kiểm tra run logs/status; kết hợp sanity check script shell local.

## Evidence
- Tool availability check:
  - `actionlint`: missing
  - `yamllint`: missing
  - `yq`: missing
  - `python`: available
  - `PyYAML`: missing (`ModuleNotFoundError: No module named 'yaml'`)
- `gh auth status`: authenticated (`anmh1205`, scope có `workflow`).
- `bash -n scripts/deploy/deploy-service.sh`: pass.
- `gh workflow view .github/workflows/* --yaml`: 404 do workflow chưa tồn tại trên default branch (đang ở `feature/cicd`, chưa merge), không dùng được cách này để parse từ remote default.

## Affected files (checked)
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/backend-uat.yml`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/postgresql-uat.yml`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/emqx-uat.yml`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/grafana-uat.yml`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.github/workflows/mobile-uat.yml`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/scripts/deploy/deploy-service.sh`

## Practical verification checklist (no new dependencies)
1. Local shell sanity
   - [x] `bash -n E:/anmh1205/IoT_Vehicle_Tracking_System/scripts/deploy/deploy-service.sh`
2. Commit/push workflow changes lên branch hiện tại (`feature/cicd`) để GitHub backend parser đọc file thật.
3. Trigger thủ công từng workflow bằng `gh workflow run ... --ref feature/cicd`:
   - [ ] backend-uat.yml
   - [ ] postgresql-uat.yml
   - [ ] emqx-uat.yml
   - [ ] grafana-uat.yml
   - [ ] mobile-uat.yml
4. Theo dõi run:
   - [ ] `gh run list --workflow <file> --branch feature/cicd --limit 1`
   - [ ] `gh run view <run-id> --log`
5. Pass criteria tối thiểu trước pilot:
   - [ ] Không có lỗi parse/compile workflow ở giai đoạn queue/prepare job.
   - [ ] Job vào được execution phase (kể cả fail do secrets/runtime vẫn chấp nhận cho mục tiêu YAML validity).
   - [ ] Bước `Validate required deploy secrets` fail đúng kỳ vọng khi chưa set secret (fail-fast expected behavior).
6. Nếu muốn giảm noise runtime khi chỉ validate parser:
   - [ ] Chạy `workflow_dispatch` và dừng trước các bước deploy thật bằng cách dùng môi trường UAT sandbox/secret giả an toàn (không đổi code).

## Residual risk before pilot
- Medium: parser local vẫn absent => phụ thuộc GitHub-hosted parser để xác nhận cú pháp.
- Medium: workflow có thể parse OK nhưng fail runtime do secret/VPS/network; đây là rủi ro vận hành, không phải rủi ro YAML syntax.
- Low-Medium: do chưa có actionlint, các lỗi semantic tinh vi (vd typo context expression hiếm) có thể chỉ lộ khi chạy path cụ thể.

## Recommendation
- Tiến hành pilot theo hướng “remote parser validation first” trên branch `feature/cicd` qua `workflow_dispatch`.
- Gate trước merge: mỗi workflow phải có ít nhất 1 run chứng minh “parse OK + start job”.
- Sau pilot ổn định, cân nhắc thêm 1 lightweight static check chính thức trong CI (không yêu cầu cài local cho mọi máy dev).

## Unresolved questions
- Có cho phép push branch để chạy `workflow_dispatch` ngay bây giờ không?
- Có UAT sandbox secrets tối thiểu để tách bạch lỗi parser với lỗi hạ tầng không?
