from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NVS = (ROOT / "components/adapter-kv-nvs/src/nvs_config.c").read_text(encoding="utf-8")
KEYS = (ROOT / "components/adapter-kv-nvs/include/nvs_store_keys.h").read_text(encoding="utf-8")
PIPELINE = (ROOT / "components/app-core/src/state_publish_pipeline.c").read_text(encoding="utf-8")
CORE = (ROOT / "components/app-core/src/state_machine_core.c").read_text(encoding="utf-8")


def test_versioned_recovery_key_and_nvs_commit():
    assert '"fw_report_v1"' in KEYS
    save = NVS.split("esp_err_t nvs_config_save_firmware_report", 1)[1].split(
        "esp_err_t nvs_config_load_firmware_report", 1
    )[0]
    assert "nvs_set_blob(handle, TRACKER_NVS_FIRMWARE_REPORT_KEY" in save
    assert save.index("nvs_set_blob(") < save.index("nvs_commit(handle)")


def test_missing_record_and_corrupt_size_are_distinct():
    load = NVS.split("esp_err_t nvs_config_load_firmware_report", 1)[1].split(
        "esp_err_t nvs_config_clear_firmware_report", 1
    )[0]
    assert "err == ESP_ERR_NVS_NOT_FOUND" in load
    assert "size != sizeof(*out_report)" in load
    assert "return ESP_ERR_INVALID_SIZE;" in load
    assert "out_report->status[sizeof(out_report->status) - 1]" in load


def test_clear_commits_and_pending_is_not_cleared_on_erase_failure():
    clear = NVS.split("esp_err_t nvs_config_clear_firmware_report", 1)[1]
    assert "nvs_erase_key(handle, TRACKER_NVS_FIRMWARE_REPORT_KEY)" in clear
    assert "nvs_commit(handle)" in clear
    success = PIPELINE.split("bool state_machine_publish_firmware_payload", 1)[1].split(
        "bool state_machine_publish_firmware_status", 1
    )[0]
    assert success.index("nvs_config_clear_firmware_report()") < success.index(
        "s_deferred_firmware_report_pending = false;"
    )
    assert "if (clear_err == ESP_OK)" in success


def test_recovery_precedes_ota_confirmation():
    init = CORE.split("esp_err_t state_machine_core_init", 1)[1]
    assert init.index("state_machine_restore_deferred_firmware_report()") < init.index(
        "state_machine_try_confirm_running_firmware()"
    )
    assert "nvs_config_save_firmware_report(firmware)" in PIPELINE
    assert "nvs_config_load_firmware_report(&restored, &found)" in PIPELINE


def test_corrupt_nvs_report_does_not_block_vehicle_runtime():
    assert "firmware_restore_err = state_machine_restore_deferred_firmware_report()" in CORE
    assert "if (firmware_restore_err != ESP_OK)" in CORE
    assert "ESP_RETURN_ON_ERROR(state_machine_restore_deferred_firmware_report()" not in CORE
    assert "s_firmware_report_restore_required = true" in PIPELINE
    assert "s_firmware_report_next_restore_ms = now_ms + 30000U;" in PIPELINE
    assert "now_ms >= s_firmware_report_next_restore_ms" in PIPELINE
    assert "state_machine_restore_deferred_firmware_report();" in PIPELINE
