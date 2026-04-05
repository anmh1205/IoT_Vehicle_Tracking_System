## Code Review Summary

### Scope
- Files: `SKILL.md`, `references/*.md`, `scripts/*.py`, `scripts/tests/*.py`, `requirements.txt`, `.env.example`
- Focus: correctness, safety, maintainability, workflow mismatch
- Scout findings: stale-log data flow, COM selection edge, stop-condition precedence

### Overall Assessment
Skill có cấu trúc rõ và script tách module tốt, nhưng có lệch workflow và vài edge case gây quyết định sai.

### High Priority
1. **Stale log làm sai trạng thái vòng lặp**: `scripts/loop_runner.py:96-101,107-118` đọc tail từ log append toàn lịch sử, nên lỗi cũ có thể giữ `unstable/fatal` dù vòng hiện tại đã ổn định.
2. **Tự flash khi chưa sửa code**: `scripts/loop_runner.py:109-111` (`--build-flash-on-error`) mâu thuẫn guardrail “chỉ flash sau khi sửa code” trong `SKILL.md:61`.
3. **Ưu tiên lỗi thấp hơn fatal**: `scripts/serial_reader.py:84-94` check `ERROR_PATTERN` trước `FATAL_PATTERNS`; line chứa cả panic+E(...) bị phân loại `unstable` thay vì `fatal`.

### Medium Priority
4. **Rủi ro chọn sai cổng im lặng**: `scripts/loop_runner.py:41-55` ưu tiên `ESP32_DEFAULT_PORT` từ `.env.example:2` (COM6), có thể bỏ qua auto-detect/AskUserQuestion khi môi trường đổi.
5. **Thiếu test cho đường lỗi serial/subprocess**: chưa có test cho `serial_reader.py` exception path và `run_build_flash` failure handling.

### Positive
- `env_loader.py` priority rõ, không ghi đè process env (`setdefault`).
- Dataclass + JSON output thuận tiện automation.

### Unresolved Questions
- Có chủ đích giữ “append toàn lịch sử” để phục vụ phân tích dài hạn, hay cần phân tách theo iteration marker?
