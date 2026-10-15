"""Compile the production NVS init routine against fault-injection stubs.

This is a host-level failure-path test, not a substitute for ESP-IDF/NVS flash tests.
"""
from pathlib import Path
import shutil
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "components/adapter-kv-nvs/src/nvs_config.c"


def extract_init_function(source: str) -> str:
    signature = "esp_err_t nvs_config_init(void) {"
    begin = source.index(signature)
    brace = source.index("{", begin)
    depth = 0
    for index in range(brace, len(source)):
        if source[index] == "{":
            depth += 1
        elif source[index] == "}":
            depth -= 1
            if depth == 0:
                return source[begin : index + 1]
    raise ValueError("Unbalanced NVS initializer")


def test_nvs_failures_do_not_erase_storage(tmp_path: Path):
    gcc = shutil.which("gcc")
    if not gcc:
        pytest.skip("GCC is not installed; ESP-IDF target test still required")

    actual_function = extract_init_function(SOURCE.read_text(encoding="utf-8"))
    harness = r"""
#include <assert.h>
#include <stdio.h>
typedef int esp_err_t;
#define ESP_OK 0
#define ESP_ERR_NVS_NO_FREE_PAGES 100
#define ESP_ERR_NVS_NEW_VERSION_FOUND 101
#define ESP_FAIL 102
#define ESP_LOGE(...) ((void)0)
static const char *TAG = "NVS";
static esp_err_t requested_result;
static int init_calls;
static int erase_calls;
static esp_err_t nvs_flash_init(void) { ++init_calls; return requested_result; }
static esp_err_t nvs_flash_erase(void) { ++erase_calls; return ESP_OK; }
static const char *esp_err_to_name(esp_err_t err) { (void)err; return "mock-error"; }
""" + actual_function + r"""
int main(void) {
    const int states[] = { ESP_OK, ESP_ERR_NVS_NO_FREE_PAGES,
                           ESP_ERR_NVS_NEW_VERSION_FOUND, ESP_FAIL };
    for (unsigned i = 0; i < sizeof(states)/sizeof(states[0]); ++i) {
        requested_result = states[i];
        init_calls = erase_calls = 0;
        assert(nvs_config_init() == requested_result);
        assert(init_calls == 1);
        assert(erase_calls == 0);
    }
    puts("NVS init: 4 fault-injected states preserve storage");
    return 0;
}
"""
    source = tmp_path / "nvs_init_test.c"
    binary = tmp_path / "nvs_init_test"
    source.write_text(harness, encoding="utf-8")
    subprocess.run(
        [gcc, "-std=c11", "-Wall", "-Wextra", "-Werror",
         "-Wno-unused-function", str(source), "-o", str(binary)],
        check=True, capture_output=True, text=True,
    )
    result = subprocess.run([str(binary)], check=True, capture_output=True, text=True)
    assert "4 fault-injected states preserve storage" in result.stdout
