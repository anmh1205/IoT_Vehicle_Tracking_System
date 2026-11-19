"""Prevent a complete SD queue rewrite on every append when ACK progress is stalled."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "components/adapter-storage-sdmmc-fatfs/src/sd_log_store.c").read_text(encoding="utf-8")


def test_gc_requires_ack_progress_once_quota_is_exceeded():
    function = SOURCE.split("esp_err_t sd_log_store_gc_if_needed(void) {", 1)[1]
    assert "gc_watermark_attempted" in function
    assert "gc_attempt_ack_seq == s_ctx.meta.ack_seq_critical" in function
    assert "s_ctx.meta.ack_seq_critical == 0U" in function
    assert function.index("gc_attempt_ack_seq == s_ctx.meta.ack_seq_critical") < function.index("fopen(SD_LOG_DATA_PATH")
