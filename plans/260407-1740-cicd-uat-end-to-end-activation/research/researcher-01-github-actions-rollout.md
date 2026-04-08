# Research Report: GitHub Actions rollout cho nhánh `uat`

- Thời điểm nghiên cứu: 2026-04-07 17:43 (Asia/Saigon)
- Phạm vi: chiến lược rollout nhiều workflow mới gắn với nhánh deploy `uat` trong repo default branch `main`
- Trọng tâm: sequence vận hành, guardrails, verify bằng `gh`, rollback khi workflow fail

## Executive Summary
Rollout an toàn nhất: tách theo pha, bật trigger hẹp cho `uat`, dùng environment protection + branch protection + concurrency để chặn deploy chồng chéo. Không nên mở rộng scope sang thay đổi kiến trúc CI ngay; giữ KISS/YAGNI: chỉ thêm kiểm soát tối thiểu để deploy ổn định.

Workflow-level rollback không phải “undo infra” tự động từ GitHub Actions; thực tế là: chặn thêm run lỗi, quay lại workflow stable/commit stable, rerun có kiểm soát, và chỉ mở lại pipeline sau khi check pass. Phải chuẩn bị sẵn runbook fail-path trước khi bật rộng.

## Operational Sequence (đề xuất rollout)
1. **Preflight baseline**
   - Snapshot workflow hiện có, branch protection hiện tại, env secrets/vars đang dùng.
   - Xác nhận quyền repo/admin + quyền Actions.
2. **Thiết lập guardrails trước, deploy sau**
   - Tạo/siết `Environment: uat`: required reviewers, prevent self-review, wait timer, branch/tag deployment rules.
   - Thêm branch protection cho `uat`: PR-only, required checks, hạn chế force-push/delete.
3. **Introduce workflow theo chế độ “dark launch”**
   - Trigger hẹp: chỉ `push`/`workflow_run`/`pull_request` liên quan `uat`; có `workflow_dispatch` để chạy tay.
   - Bật `concurrency` cho deploy job theo `uat` để single-flight.
   - Giảm `permissions` token theo least privilege.
4. **Pilot verification (1-3 run đầu)**
   - Chạy thủ công, quan sát log + artifacts + deployment gate behavior.
   - Chỉ khi pass liên tiếp mới mở trigger tự động hoàn toàn.
5. **Progressive activation**
   - Kích hoạt dần từng workflow (build -> test -> deploy), không bật đồng loạt.
   - Mỗi bước có checkpoint go/no-go.
6. **Steady-state ops**
   - Theo dõi run failure rate, lead time, manual approval latency.
   - Duy trì rollback drill định kỳ.

## Guardrails bắt buộc
- **Branch filters chặt**: workflow deploy chỉ chạy cho `uat` (tránh chạy nhầm `main`).
- **Environment protection**:
  - Required reviewers
  - Prevent self-review
  - Wait timer (đủ để hủy nếu phát hiện lỗi sớm)
  - Deployment branch rules chỉ cho ref hợp lệ
- **Concurrency**: chỉ 1 deploy `uat` tại một thời điểm; run mới có thể cancel run cũ nếu policy cho phép.
- **Least privilege**: explicit `permissions`; không cấp mặc định rộng.
- **Reusable workflow contract**: khai báo rõ `workflow_call.inputs`/`secrets`; reject input/secrets lạ.
- **No-admin-bypass (khuyến nghị)**: tránh bypass protection ngẫu hứng.

## Command-level Checklist (`gh` CLI ưu tiên)

### A. Discovery / baseline
```bash
gh auth status
gh repo view --json nameWithOwner,defaultBranchRef
gh workflow list
gh run list --limit 20
```

### B. Validate workflow visibility & triggerability
```bash
gh workflow view "<workflow-name-or-id>"
gh workflow run "<workflow-name-or-id>" --ref uat
gh run list --branch uat --limit 20
gh run watch <run-id>
gh run view <run-id> --log
```

### C. Verify deployment health on `uat`
```bash
gh run list --branch uat --status failure --limit 20
gh run list --branch uat --status in_progress --limit 20
gh run download <run-id> -D ./artifacts
```

### D. Failure operations (workflow-level)
```bash
gh run cancel <run-id>
gh run rerun <run-id>
gh run rerun <run-id> --failed
gh workflow disable "<workflow-name-or-id>"
gh workflow enable "<workflow-name-or-id>"
```

## Rollback Strategy (workflow-level failures)

### Trigger conditions rollback
- Deploy workflow fail lặp lại > ngưỡng cho phép (vd 2 lần liên tiếp)
- Gate environment bị bypass/sai cấu hình
- Deploy chồng chéo hoặc run treo gây mất kiểm soát

### Rollback playbook (ngắn, thực chiến)
1. **Freeze**: `gh workflow disable <deploy-workflow>` để chặn phát sinh run mới.
2. **Stop active blast radius**: `gh run cancel <run-id>` cho run đang chạy.
3. **Revert control plane**:
   - Revert commit workflow vừa đổi về bản stable trước đó (qua PR).
   - Nếu cần, tạm chuyển deploy sang `workflow_dispatch` only để chạy tay.
4. **Recover known-good**:
   - Trigger lại bản stable trên `uat`: `gh workflow run ... --ref uat`.
   - Theo dõi: `gh run watch`, `gh run view --log`.
5. **Re-open cautiously**:
   - `gh workflow enable <deploy-workflow>` sau khi pass tiêu chí ổn định.

### Anti-pattern cần tránh
- Bật nhiều workflow mới cùng lúc rồi mới debug.
- Dùng broad token permissions “cho nhanh”.
- Không khóa concurrency cho deploy branch.

## Go/No-Go Criteria
- 3 run liên tiếp `uat` pass (build/test/deploy)
- Không còn failure mở trên nhánh `uat`
- Approval gate hoạt động đúng (có reviewer, không self-approve)
- Mean time to recovery (MTTR) đạt mục tiêu nội bộ

## References
- GitHub Docs: Workflow syntax for GitHub Actions  
  https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub Docs: Using environments for deployment  
  https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
- GitHub Docs: Managing protected branches  
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
- GitHub CLI Manual: `gh workflow`  
  https://cli.github.com/manual/gh_workflow
- GitHub Docs: Managing workflow runs  
  https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs

## Unresolved Questions
1. Repo hiện đã có environment `uat` chưa, và protection rule hiện tại là gì?
2. Ngưỡng rollback chính thức (số lần fail liên tiếp / thời gian) đang được team chấp nhận?
3. Workflow nào là critical path (build/test/deploy) để xác định thứ tự activation chính xác?
4. Team có policy cho `cancel-in-progress` trên deploy production-like branch không?
