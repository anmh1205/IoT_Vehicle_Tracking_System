from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SD_STORE = (ROOT / "components/adapter-storage-sdmmc-fatfs/src/sd_log_store.c").read_text(encoding="utf-8")


def function_block(name: str, next_name: str) -> str:
    return SD_STORE.split(f"static esp_err_t {name}(void) {{", 1)[1].split(
        f"static esp_err_t {next_name}(", 1
    )[0]


def test_meta_recovery_never_promotes_partial_tmp_before_valid_backup():
    block = function_block(
        "sd_log_store_recover_meta_if_needed", "sd_log_store_recover_data_if_needed"
    )
    assert "sd_log_store_meta_candidate_valid(SD_LOG_META_BAK_PATH)" in block
    assert "sd_log_store_meta_candidate_valid(SD_LOG_META_TMP_PATH)" in block
    assert "selected = SD_LOG_META_BAK_PATH" in block
    assert block.index("selected = SD_LOG_META_BAK_PATH") < block.index(
        "selected = SD_LOG_META_TMP_PATH"
    )
    selected_branch = block.split("const char *selected = NULL;", 1)[1]
    assert selected_branch.index("rename(selected, SD_LOG_META_PATH)") < selected_branch.index(
        "remove(SD_LOG_META_TMP_PATH)"
    )


def test_log_recovery_requires_full_record_scan_and_keeps_backup_on_failure():
    block = function_block(
        "sd_log_store_recover_data_if_needed", "sd_log_store_apply_host_slot"
    )
    assert "sd_log_store_data_candidate_valid(SD_LOG_DATA_BAK_PATH)" in block
    assert "sd_log_store_data_candidate_valid(SD_LOG_DATA_TMP_PATH)" in block
    assert block.index("selected = SD_LOG_DATA_BAK_PATH") < block.index(
        "selected = SD_LOG_DATA_TMP_PATH"
    )
    selected_branch = block.split("const char *selected = NULL;", 1)[1]
    assert selected_branch.index("rename(selected, SD_LOG_DATA_PATH)") < selected_branch.index(
        "remove(SD_LOG_DATA_TMP_PATH)"
    )
    validator = SD_STORE.split("static bool sd_log_store_data_candidate_valid(", 1)[1].split(
        "static esp_err_t sd_log_store_recover_meta_if_needed(", 1
    )[0]
    assert "line[size - 1U]" in validator
    assert "sd_log_store_parse_record(line, &record)" in validator
    assert "record.seq <= last_sequence" in validator


def test_truncated_cursor_no_longer_resets_and_continues_as_success():
    block = SD_STORE.split("static esp_err_t sd_log_store_read_meta(void) {", 1)[1].split(
        "static esp_err_t sd_log_store_write_meta(void)", 1
    )[0]
    assert "read_len != sizeof(s_ctx.meta)" in block
    assert "s_ctx.meta.ack_seq_critical > s_ctx.meta.write_seq" in block
    assert "return ESP_ERR_INVALID_SIZE;" in block
    assert "invalid queue metadata snapshot" in block
