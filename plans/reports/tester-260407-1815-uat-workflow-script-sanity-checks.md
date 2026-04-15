# Tester Report — UAT workflow/script sanity checks

## Phạm vi
- `scripts/deploy/deploy-service.sh`
- `.github/workflows/backend-uat.yml`
- `.github/workflows/postgresql-uat.yml`
- `.github/workflows/emqx-uat.yml`
- `.github/workflows/grafana-uat.yml`
- `.github/workflows/mobile-uat.yml`

## Kết quả
### 1) Shell syntax check
- `bash -n scripts/deploy/deploy-service.sh` — PASS

### 2) Workflow YAML sanity checks
- `python + PyYAML` parse — FAIL, thiếu dependency `yaml` / `PyYAML`
- `ruby Psych` parse — FAIL, không có `ruby`
- `actionlint` — FAIL, command không tồn tại
- `yq` — FAIL, command không tồn tại
- `yamllint` — FAIL, command không tồn tại
- `node yaml/js-yaml` — FAIL, package không cài
- `perl YAML::XS / YAML::PP` — FAIL, module không cài
- Kiểm tra file tồn tại — PASS, các file mục tiêu có mặt

## Đánh giá từng hạng mục
- `scripts/deploy/deploy-service.sh`: PASS, không thấy lỗi cú pháp shell rõ ràng
- `.github/workflows/backend-uat.yml`: BLOCKED, chưa thể machine-validate YAML do thiếu parser/linter
- `.github/workflows/postgresql-uat.yml`: BLOCKED, chưa thể machine-validate YAML do thiếu parser/linter
- `.github/workflows/emqx-uat.yml`: BLOCKED, chưa thể machine-validate YAML do thiếu parser/linter
- `.github/workflows/grafana-uat.yml`: BLOCKED, chưa thể machine-validate YAML do thiếu parser/linter
- `.github/workflows/mobile-uat.yml`: BLOCKED, chưa thể machine-validate YAML do thiếu parser/linter

## Blocker / dependency
- Môi trường hiện tại không có công cụ validate YAML phù hợp: `actionlint`, `yq`, `yamllint`, `ruby`, PyYAML, `js-yaml`, `YAML::XS`, `YAML::PP`.
- Vì vậy chỉ có thể xác nhận file tồn tại và đọc được bằng mắt; chưa thể khẳng định YAML hợp lệ bằng parser.

## Kết luận ngắn
- Mức sẵn sàng để merge/pilot UAT: **partial / chưa đủ chắc chắn**.
- Script deploy đã qua kiểm tra cú pháp.
- Workflow YAML chưa được xác thực machine-level do thiếu dependency, nên vẫn còn blocker cho kết luận sẵn sàng merge.

## Unresolved questions
- Có cho phép cài thêm `actionlint` hoặc parser YAML để chạy lại check không?
- Có muốn mình tiếp tục bằng một bộ sanity check thô dựa trên regex/structure nếu không cài được tool không?
