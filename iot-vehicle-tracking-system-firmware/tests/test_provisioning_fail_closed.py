"""Execute the production bootstrap identity check against host fixture values.

The test covers the exact boot guard used before modem/MQTT initialization.
Power-cut reliability on physical NVS still requires on-board acceptance.
"""
from pathlib import Path
import shutil
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[1]
BOOT = (ROOT / "components/app-core/src/tracker-app-bootstrap.c").read_text(encoding="utf-8")
STORE = (ROOT / "components/adapter-kv-nvs/src/config_store_nvs.c").read_text(encoding="utf-8")


def extract_c_function(source: str, signature: str) -> str:
    start = source.index(signature)
    brace = source.index("{", start)
    depth = 0
    for idx in range(brace, len(source)):
        if source[idx] == "{":
            depth += 1
        elif source[idx] == "}":
            depth -= 1
            if depth == 0:
                return source[start:idx + 1]
    raise ValueError("unbalanced bootstrap guard")


def test_real_boot_guard_rejects_missing_and_placeholder_credentials(tmp_path: Path):
    compiler = shutil.which("gcc")
    if not compiler:
        pytest.skip("host GCC unavailable; ESP-IDF cross-compile remains required")
    helper = extract_c_function(
        BOOT, "static bool tracker_boot_has_provisioned_identity(const config_t *config) {"
    )
    harness = (
        "#include <assert.h>\n"
        "#include <stdbool.h>\n"
        "#include <string.h>\n"
        "typedef struct { char device_id[48]; char auth_token[128]; bool valid; } config_t;\n"
        "static bool app_config_is_valid(const config_t *config) {\n"
        "  return config && config->valid && config->device_id[0] && config->auth_token[0];\n"
        "}\n"
        + helper
        + """
int main(void) {
  config_t blank = {0};
  config_t placeholder = {.valid = true};
  strcpy(placeholder.device_id, "TRACKER_001");
  strcpy(placeholder.auth_token, "provisioning-required");
  config_t real = {.valid = true};
  strcpy(real.device_id, "IVTS_12345");
  strcpy(real.auth_token, "non-default-device-secret");
  assert(!tracker_boot_has_provisioned_identity(NULL));
  assert(!tracker_boot_has_provisioned_identity(&blank));
  assert(!tracker_boot_has_provisioned_identity(&placeholder));
  strcpy(placeholder.device_id, "IVTS_12345");
  assert(!tracker_boot_has_provisioned_identity(&placeholder));
  strcpy(placeholder.auth_token, "non-default-device-secret");
  assert(tracker_boot_has_provisioned_identity(&placeholder));
  assert(tracker_boot_has_provisioned_identity(&real));
  real.valid = false;
  assert(!tracker_boot_has_provisioned_identity(&real));
  return 0;
}
"""
    )
    source = tmp_path / "boot_identity.c"
    binary = tmp_path / "boot_identity"
    source.write_text(harness, encoding="utf-8")
    compiled = subprocess.run(
        [compiler, "-std=c11", "-Wall", "-Wextra", "-Werror", str(source),
         "-o", str(binary)],
        capture_output=True, text=True,
    )
    assert compiled.returncode == 0, compiled.stderr
    subprocess.run([str(binary)], check=True, capture_output=True, text=True)


def test_blank_nvs_is_not_initialized_with_default_identity():
    start = STORE.index("esp_err_t config_store_nvs_load(config_t *config)")
    part = STORE[start:]
    absent = part.split("if (err == ESP_ERR_NVS_NOT_FOUND)", 1)[1].split(
        "ESP_RETURN_ON_FALSE(err == ESP_OK", 1
    )[0]
    assert "return ESP_ERR_NOT_FOUND;" in absent
    assert "config_store_nvs_save(config)" not in absent
    assert "provisioning_required_no_write" in absent


def test_boot_halts_before_modem_when_identity_unprovisioned():
    assert "tracker_boot_has_provisioned_identity(&config)" in BOOT
    assert BOOT.index("tracker_boot_has_provisioned_identity(&config)") < BOOT.index(
        "err = state_machine_init(&config)"
    )
    assert "action=fallback_to_defaults" not in BOOT
    assert "event=unprovisioned_or_invalid_identity action=halt_boot_no_modem_no_mqtt" in BOOT
