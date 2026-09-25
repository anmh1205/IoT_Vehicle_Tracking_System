from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OTA = (ROOT / "components/app-core/src/state_ota_runtime.c").read_text(encoding="utf-8")
CORE = (ROOT / "components/app-core/src/state_machine_core.c").read_text(encoding="utf-8")
HEADER = (ROOT / "components/app-core/include/state_ota_runtime.h").read_text(encoding="utf-8")


def test_ota_restore_reports_errors_and_confirm_retries():
    assert "esp_err_t state_machine_restore_ota_context_from_nvs(void)" in OTA
    assert "return err;" in OTA
    confirm = OTA.split("void state_machine_try_confirm_running_firmware(void)", 1)[1]
    assert "s_ota_confirm_checked = true;" in confirm
    assert confirm.index("state_machine_restore_ota_context_from_nvs()") < confirm.index(
        "s_ota_confirm_checked = true;"
    )
    assert "s_ota_confirm_retry_after_ms = now_ms + OTA_CONFIRM_RESTORE_RETRY_MS;" in confirm
    assert "state_machine_try_confirm_running_firmware();" in CORE


def test_boot_success_requires_readable_persisted_ota_state():
    assert "esp_err_t ota_restore_err = state_machine_restore_ota_context_from_nvs();" in CORE
    assert "if (ota_restore_err == ESP_OK && !had_pending_confirm)" in CORE
    assert "firmware_boot_status_deferred" in CORE
    assert "esp_err_t state_machine_restore_ota_context_from_nvs(void);" in HEADER
