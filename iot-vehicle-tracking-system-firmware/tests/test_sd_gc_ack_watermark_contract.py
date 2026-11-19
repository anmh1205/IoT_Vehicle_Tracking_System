"""Quota GC throttles repeated rewriting while retaining critical journal entries."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "components/adapter-storage-sdmmc-fatfs/src/sd_log_store.c").read_text(encoding="utf-8")


def test_gc_requires_ack_progress_or_substantial_growth_once_quota_exceeded():
    function = SOURCE.split("esp_err_t sd_log_store_gc_if_needed(void) {", 1)[1]
    assert "gc_watermark_attempted" in function
    assert "gc_attempt_ack_seq == s_ctx.meta.ack_seq_critical" in function
    assert "stats.bytes_used - s_ctx.gc_attempt_bytes_used" in function
    assert function.index("gc_attempt_ack_seq == s_ctx.meta.ack_seq_critical") < function.index("fopen(SD_LOG_DATA_PATH")


def test_gc_prioritizes_critical_even_without_ack_watermark():
    function = SOURCE.split("esp_err_t sd_log_store_gc_if_needed(void) {", 1)[1]
    assert "evict_noncritical_bytes" in function
    assert "rec.critical == 0 && evict_noncritical_bytes > 0U" in function
    assert "telemetry_counters_inc_quota_evicted_noncritical" in function
    assert "sd_quota_critical_only_overflow" in function


def test_gc_retains_post_compaction_watermark_to_avoid_critical_only_rewrite_loop():
    function = SOURCE.split("esp_err_t sd_log_store_gc_if_needed(void) {", 1)[1]
    assert "s_ctx.gc_watermark_attempted = true;" in function
    assert "compacted_stat" in function
    assert "s_ctx.gc_attempt_bytes_used = (size_t)compacted_stat.st_size;" in function
    assert "s_ctx.gc_watermark_attempted = false;" in function  # under limit
