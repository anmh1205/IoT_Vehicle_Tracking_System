"""Exercise the production NimBLE notification and raw AT transaction C code.

This is a host fake-GATT test of real functions, not a pure string/parser
contract. Physical ELM327/ECU behavior still needs device testing.
"""
from pathlib import Path
import os
import shutil
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "components/adapter-ble-obd-nimble/src/ble_obd.c"
PARSER = ROOT / "components/adapter-ble-obd-nimble/src/elm327_reply.h"


def function(source: str, signature: str) -> str:
    start = source.index(signature)
    depth = 0
    for idx in range(source.index("{", start), len(source)):
        if source[idx] == "{":
            depth += 1
        elif source[idx] == "}":
            depth -= 1
            if depth == 0:
                return source[start:idx + 1]
    raise ValueError("Unbalanced C definition")


def test_real_ble_notification_assembly_and_raw_at_failure_paths(tmp_path: Path):
    gcc = shutil.which("gcc")
    if not gcc:
        pytest.skip("Host GCC unavailable; ESP-IDF cross-compile remains required")
    source = SOURCE.read_text(encoding="utf-8")
    reset = function(source, "static void ble_obd_response_reset(ble_obd_ctx_t *ctx) {")
    prompt = function(source, "static bool ble_obd_response_has_prompt(const char *response) {")
    notify = function(source, "static void ble_obd_notify_cb(const uint8_t *data, size_t len, uint16_t attr_handle, void *usr_ctx) {")
    send = function(source, "esp_err_t ble_obd_send_raw(ble_obd_ctx_t *ctx, const char *command, uint32_t timeout_ms) {")
    harness = r"""
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <ctype.h>
#include <stdio.h>
""" + '#include "' + PARSER.as_posix() + '"\n' + r"""
#define BLE_OBD_MAX_DATA_LEN 64
#define MIN_VALUE(a,b) ((a)<(b)?(a):(b))
#define ARRAY_SIZE(a) (sizeof(a)/sizeof((a)[0]))
#define TAG "HOST_BLE_OBD"
#define ESP_OK 0
#define ESP_FAIL (-1)
#define ESP_ERR_TIMEOUT (-2)
#define ESP_ERR_INVALID_STATE (-3)
#define ESP_ERR_INVALID_ARG (-4)
#define ESP_LOGW(...) ((void)0)
#define ESP_RETURN_ON_NULL(value, code, tag, ...) do { if (!(value)) return code; } while (0)
#define BLE_MGR_E_OK 0
#define BLE_MGR_E_FAIL 1
#define pdTRUE 1
#define pdFALSE 0
#define pdMS_TO_TICKS(ms) (ms)
typedef int esp_err_t;
typedef int BaseType_t;
typedef int ble_mgr_status_t;
typedef struct { int fake; } ble_mgr_ctx_t;
typedef struct { int tokens; } fake_sem_t;
typedef fake_sem_t *SemaphoreHandle_t;
typedef void (*ble_obd_response_cb_t)(
    uint8_t mode, int pid, const uint8_t *values, size_t length, void *user);
typedef enum {
    BLE_OBD_RESPONSE_STATE_UNKNOWN,
    BLE_OBD_RESPONSE_STATE_LIVE,
    BLE_OBD_RESPONSE_STATE_STOPPED,
    BLE_OBD_RESPONSE_STATE_NO_DATA,
    BLE_OBD_RESPONSE_STATE_SEARCHING,
    BLE_OBD_RESPONSE_STATE_ERROR
} ble_obd_response_state_t;
typedef struct ble_obd_ctx {
    ble_mgr_ctx_t *mgr_ctx;
    ble_obd_response_cb_t response_cb;
    SemaphoreHandle_t api_mutex;
    SemaphoreHandle_t response_sem;
    struct {
        char tx_buf[32];
        uint8_t mode, pid;
        bool expect_pid_header, expect_obd_response, got_valid_payload;
        bool raw_pending, raw_response_ok, raw_is_reset, raw_is_at;
    } tx_data;
    struct {
        char buf[BLE_OBD_MAX_DATA_LEN];
        size_t len;
        bool has_error, overflowed;
    } rx_data;
    struct {
        uint32_t rxtx_total, notify_valid, notify_invalid, rxtx_timeout, rx_overflow;
        uint32_t last_log_tick;
    } diag;
    ble_obd_response_state_t last_response_state;
    void *usr_ctx;
} ble_obd_ctx_t;
static BaseType_t xSemaphoreTake(SemaphoreHandle_t sem, unsigned ticks) {
    (void)ticks;
    if (sem->tokens <= 0) return pdFALSE;
    --sem->tokens;
    return pdTRUE;
}
static void xSemaphoreGive(SemaphoreHandle_t sem) { ++sem->tokens; }
static uint16_t ble_obd_tx_handle(void) { return 1; }
static uint16_t ble_obd_rx_handle(void) { return 2; }
static bool ble_obd_parse_hex_response(const char *response, uint8_t *values,
                                        size_t max_values, size_t *out_count) {
    (void)response; (void)values; (void)max_values;
    *out_count = 0;
    return false;
}
static ble_obd_response_state_t ble_obd_classify_response_state(
    ble_obd_ctx_t *ctx, bool valid) {
    (void)ctx; return valid ? BLE_OBD_RESPONSE_STATE_LIVE : BLE_OBD_RESPONSE_STATE_ERROR;
}
static void telemetry_counters_inc_obd_read_ok(void) {}
static void telemetry_counters_inc_obd_invalid_response(void) {}
static void ble_obd_notify_cb(const uint8_t *data, size_t len, uint16_t handle, void *ctx);
static ble_obd_ctx_t *g_context;
static const char *g_response;
static bool g_fragment, g_wrong_handle, g_send_failure;
static ble_mgr_status_t ble_mgr_send(ble_mgr_ctx_t *mgr, uint16_t handle,
                                     const void *bytes, size_t count) {
    (void)mgr; (void)handle; (void)bytes; (void)count;
    if (g_send_failure) return BLE_MGR_E_FAIL;
    if (g_response) {
        const size_t length = strlen(g_response);
        const size_t split = g_fragment && length > 2 ? length / 2 : length;
        const uint16_t rx = g_wrong_handle ? 3 : ble_obd_rx_handle();
        ble_obd_notify_cb((const uint8_t *)g_response, split, rx, g_context);
        if (split < length) {
            ble_obd_notify_cb((const uint8_t *)g_response + split,
                              length - split, rx, g_context);
        }
    }
    return BLE_MGR_E_OK;
}
""" + "\n" + prompt + "\n" + reset + "\n" + notify + "\n" + send + r"""
static void set_reply(const char *reply, bool fragmented) {
    g_response = reply;
    g_fragment = fragmented;
    g_wrong_handle = g_send_failure = false;
}
int main(void) {
    fake_sem_t mutex = { .tokens = 1 };
    fake_sem_t response_sem = { .tokens = 0 };
    ble_mgr_ctx_t manager = {0};
    ble_obd_ctx_t ctx = {0};
    ctx.mgr_ctx = &manager;
    ctx.api_mutex = &mutex;
    ctx.response_sem = &response_sem;
    g_context = &ctx;

    // Stray/late prompt with no pending request cannot release a waiter.
    const char *stale = "ATZ\rOK\r>";
    ble_obd_notify_cb((const uint8_t *)stale, strlen(stale), 2, &ctx);
    assert(response_sem.tokens == 0);

    set_reply("ATZ\rELM327 v2.1\r>", true);
    assert(ble_obd_send_raw(&ctx, "ATZ\r", 1000) == ESP_OK);
    assert(ctx.rx_data.len == 0 && response_sem.tokens == 0);
    assert(mutex.tokens == 1);

    set_reply("ATE0\rOK\r>", true);
    assert(ble_obd_send_raw(&ctx, "ATE0\r", 1000) == ESP_OK);
    set_reply("ATSP0\r?\r>", true);
    assert(ble_obd_send_raw(&ctx, "ATSP0\r", 1000) == ESP_FAIL);
    set_reply("ATSP0\rERROR\r>", true);
    assert(ble_obd_send_raw(&ctx, "ATSP0\r", 1000) == ESP_FAIL);
    set_reply("NO DATA\r>", true);
    assert(ble_obd_send_raw(&ctx, "ATSP0\r", 1000) == ESP_FAIL);
    set_reply("ATZ\rOK\r>", true);
    assert(ble_obd_send_raw(&ctx, "ATZ\r", 1000) == ESP_FAIL);

    // Wrong RX characteristic may not satisfy a pending command.
    set_reply("ATE0\rOK\r>", true);
    g_wrong_handle = true;
    assert(ble_obd_send_raw(&ctx, "ATE0\r", 1000) == ESP_ERR_TIMEOUT);

    // No response, then failed GATT write are distinct fail-closed paths.
    set_reply(NULL, false);
    assert(ble_obd_send_raw(&ctx, "ATE0\r", 1000) == ESP_ERR_TIMEOUT);
    g_send_failure = true;
    assert(ble_obd_send_raw(&ctx, "ATE0\r", 1000) == ESP_FAIL);

    // Oversized response overflows the RX accumulator and must fail closed.
    char too_big[100];
    memset(too_big, 'X', sizeof(too_big));
    too_big[sizeof(too_big) - 2] = '>';
    too_big[sizeof(too_big) - 1] = '\0';
    set_reply(too_big, true);
    assert(ble_obd_send_raw(&ctx, "ATE0\r", 1000) == ESP_FAIL);
    assert(ctx.diag.rx_overflow > 0);
    assert(mutex.tokens == 1 && response_sem.tokens == 0);
    return 0;
}
""";
    test_file = tmp_path / "ble_obd_transaction.c"
    binary = tmp_path / ("ble_obd_transaction.exe" if os.name == "nt" else "ble_obd_transaction")
    test_file.write_text(harness, encoding="utf-8")
    built = subprocess.run(
        [gcc, "-std=c11", "-Wall", "-Wextra", "-Werror", str(test_file), "-o", str(binary)],
        text=True, capture_output=True,
    )
    assert built.returncode == 0, built.stderr
    subprocess.run([str(binary)], check=True, capture_output=True, text=True)
