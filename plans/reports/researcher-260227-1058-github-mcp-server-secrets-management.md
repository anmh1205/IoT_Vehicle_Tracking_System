# GitHub MCP Server — Secrets Management Research

**Date:** 2026-02-27
**Topic:** GitHub MCP Server support for repository secrets management (CI/CD)

---

## 1. Kết luận ngắn gọn

**GitHub MCP Server chính thức (github/github-mcp-server) CÓ hỗ trợ quản lý repository secrets**, bao gồm tạo, cập nhật, liệt kê và xóa secrets. Tuy nhiên, có sự khác biệt nhỏ về tên tool giữa các phiên bản và nguồn tài liệu.

---

## 2. Tools liên quan đến Secrets

### 2a. Secrets Management (dưới nhóm CI/CD)

Từ README chính thức tại `github.com/github/github-mcp-server`:

| Tool | Mô tả |
|------|--------|
| `list_repository_secrets` | Liệt kê secrets của repo (chỉ tên, không trả về giá trị) |
| `create_or_update_secret` | Tạo mới hoặc cập nhật một repository secret |
| `delete_secret` | Xóa một repository secret |

> Không có tool riêng tên `set_secret` hay `create_secret` — chức năng này được gộp vào `create_or_update_secret`.

### 2b. Secret Scanning (khác với secrets management)

Nhóm này dành cho **bảo mật code**, không phải CI/CD secrets:

| Tool | Mô tả |
|------|--------|
| `get_secret_scanning_alert` | Lấy chi tiết một secret scanning alert |
| `list_secret_scanning_alerts` | Liệt kê các secret scanning alerts |

---

## 3. Toàn bộ Tools của GitHub MCP Server

### Users
- `get_me`

### Issues
- `create_issue`, `get_issue`, `list_issues`, `update_issue`, `add_issue_comment`, `search_issues`

### Pull Requests
- `create_pull_request`, `get_pull_request`, `list_pull_requests`, `merge_pull_request`, `update_pull_request`
- `get_pull_request_files`, `get_pull_request_status`, `update_pull_request_branch`
- `get_pull_request_comments`, `get_pull_request_reviews`, `create_pull_request_review`
- `request_copilot_review`

### Repositories
- `create_or_update_file`, `create_repository`, `delete_file`, `fork_repository`
- `get_file_contents`, `list_branches`, `list_commits`, `push_files`
- `search_repositories`, `get_commit`, `create_branch`

### Search
- `search_code`, `search_issues`, `search_repositories`, `search_users`

### Code Scanning
- `get_code_scanning_alert`, `list_code_scanning_alerts`

### Secret Scanning
- `get_secret_scanning_alert`, `list_secret_scanning_alerts`

### CI/CD (bao gồm Secrets Management)
- `list_workflow_runs`, `get_workflow_run`, `list_workflows`
- `get_workflow_run_logs`, `rerun_workflow_run`, `cancel_workflow_run`
- `create_workflow_dispatch`, `list_workflow_run_jobs`
- `get_job_logs`, `get_workflow_run_usage`
- **`list_repository_secrets`** — liệt kê secrets
- **`create_or_update_secret`** — tạo/cập nhật secret
- **`delete_secret`** — xóa secret

### Notifications
- `list_notifications`, `get_notification_details`, `dismiss_notification`
- `mark_all_notifications_read`, `manage_notification_subscription`

### GitHub Discussions
- `list_discussions`, `get_discussion`, `list_discussion_comments`
- `get_discussion_comment`, `add_discussion_comment`
- `update_discussion_comment`, `delete_discussion_comment`

### Dependency Graph
- `get_dependency_graph_snapshot`, `get_sbom`

---

## 4. Cách sử dụng `create_or_update_secret`

```json
{
  "tool": "create_or_update_secret",
  "parameters": {
    "owner": "my-org",
    "repo": "my-repo",
    "secret_name": "MY_SECRET_KEY",
    "secret_value": "plain-text-value"
  }
}
```

> MCP server tự động xử lý việc mã hóa (libsodium/NaCl) trước khi gửi lên GitHub API. Người dùng truyền vào **plain text**, server lo phần mã hóa.

---

## 5. Cấu hình Toolsets

GitHub MCP Server có thể bật/tắt từng nhóm tool qua biến môi trường hoặc CLI flag:

```bash
# Biến môi trường
GITHUB_TOOLSETS=repos,actions,code_security

# Hoặc Docker
docker run -e GITHUB_TOOLSETS=repos,actions,code_security ghcr.io/github/github-mcp-server
```

Secrets management nằm trong toolset **`actions`** (hoặc một toolset tách riêng tùy phiên bản).

---

## 6. Yêu cầu xác thực

- GitHub Personal Access Token (PAT) với scope `repo` và `secrets`
- Hoặc GitHub App token với permission `secrets: write`
- Token truyền qua biến môi trường: `GITHUB_PERSONAL_ACCESS_TOKEN`

---

## 7. Thay thế: `gh` CLI

Nếu không dùng MCP, `gh` CLI là lựa chọn đơn giản và đáng tin cậy hơn cho automation scripts:

```bash
# Tạo/cập nhật secret
gh secret set MY_SECRET_KEY --body "secret-value" --repo owner/repo

# Liệt kê secrets
gh secret list --repo owner/repo

# Xóa secret
gh secret delete MY_SECRET_KEY --repo owner/repo

# Set từ file
gh secret set MY_SECRET_KEY < secret-file.txt

# Set cho environment
gh secret set MY_SECRET_KEY --env production --repo owner/repo
```

**Ưu điểm `gh` CLI so với MCP:**
- Không cần cấu hình MCP server
- Hoạt động tốt trong CI/CD pipelines (GitHub Actions, scripts)
- Ổn định hơn, được GitHub officially support lâu dài
- Đơn giản, dễ debug

---

## 8. So sánh MCP vs `gh` CLI cho secrets

| Tiêu chí | GitHub MCP Server | `gh` CLI |
|----------|-------------------|----------|
| Dùng trong AI agent/LLM | Tốt | Qua bash tool |
| Dùng trong CI/CD scripts | Không lý tưởng | Tốt nhất |
| Cần cài đặt extra | Có (MCP server) | Chỉ `gh` CLI |
| Hỗ trợ env secrets | Có thể (tùy phiên bản) | Có (`--env`) |
| Org-level secrets | Có (nếu có quyền) | Có |
| Độ tin cậy | Medium (còn evolving) | High |

---

## Nguồn tham khảo

- [github/github-mcp-server — GitHub Repository](https://github.com/github/github-mcp-server)
- [GitHub Docs — Secrets REST API](https://docs.github.com/en/rest/actions/secrets)
- [Model Context Protocol Spec](https://modelcontextprotocol.io)

---

## Câu hỏi chưa giải quyết

1. **Toolset name chính xác cho secrets**: Không rõ secrets tools nằm trong toolset `actions` hay một toolset độc lập — cần kiểm tra lại với phiên bản MCP server đang dùng.
2. **Environment secrets**: Tool `create_or_update_secret` có hỗ trợ environment secrets không, hay chỉ repo-level? Cần xác nhận qua source code.
3. **Org-level secrets**: Tài liệu không nhất quán về org-level secret tools — có thể chưa được implement.
4. **Encryption**: MCP server có tự xử lý mã hóa libsodium không, hay người dùng phải tự mã hóa trước khi truyền vào?
