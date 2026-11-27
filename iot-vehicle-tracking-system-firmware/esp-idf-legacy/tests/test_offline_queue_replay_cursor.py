"""Host behavioral regression for SD replay failure paths (no ESP-IDF board required)."""

import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest


SRC = (
    Path(__file__).resolve().parents[1]
    / "components"
    / "domain-storage"
    / "src"
    / "offline_queue.c"
).read_text(encoding="utf-8")


def test_replay_never_publishes_stale_obd_when_cursor_write_fails():
    if shutil.which("gcc") is None:
        pytest.skip("GCC host compiler not available")

    # Compile the actual replay functions with isolated fakes for the SD/MQTT
    # ports. This exercises control flow, rather than asserting source strings.
    start = SRC.index("static void offline_queue_schedule_replay_retry(")
    end = SRC.index("/**\n * @brief Decide whether live rawdata", start)
    replay = SRC[start:end]

    prelude = r"""
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#define ESP_OK 0
#define ESP_FAIL (-1)
#define CONFIG_TRACKER_SD_REPLAY_ENABLE 1
#define OFFLINE_QUEUE_REPLAY_MIN_PUBLISH_INTERVAL_MS 600ULL
#define ESP_LOGW(tag, ...) ((void)(tag))
#define ESP_LOGI(tag, ...) ((void)(tag))

typedef int esp_err_t;
typedef struct { uint32_t replay_seq; uint32_t ack_seq_critical; } sd_log_meta_t;
typedef struct { uint32_t seq; bool critical; } sd_log_record_t;
typedef struct { unsigned long attempts; } retry_state_t;
typedef struct { int unused; } retry_policy_t;
typedef struct {
    bool initialized;
    bool online;
    uint64_t last_replay_publish_ms;
    retry_state_t replay_retry;
} offline_queue_ctx_t;

static offline_queue_ctx_t s_ctx;
static const char *TAG = "REPLAY_TEST";
static int g_cursor_rc = ESP_OK;
static int g_firmware_ack_rc = ESP_OK;
static int g_publish_rc = ESP_OK;
static bool g_stale_obd;
static bool g_stale_firmware;
static bool g_acked_critical;
static int g_published;
static int g_retry_count;
static int g_retry_scheduled;
static int g_dropped;
static int g_firmware_success;

static uint64_t util_uptime_ms(void) { return 1000U; }
static void offline_queue_try_mount(uint64_t now) { (void)now; }
static bool sd_log_store_is_mounted(void) { return true; }
static bool tracker_mqtt_is_connected(void) { return true; }
static bool retry_state_can_run(retry_state_t *state, uint64_t now) {
    (void)state; (void)now; return true;
}
static int sd_log_store_get_meta(sd_log_meta_t *meta) {
    meta->replay_seq = 1;
    meta->ack_seq_critical = g_acked_critical ? 1 : 0;
    return ESP_OK;
}
static int sd_log_store_peek_next(uint32_t seq, sd_log_record_t *rec) {
    rec->seq = seq;
    rec->critical = g_acked_critical;
    return ESP_OK;
}
static bool offline_queue_is_stale_obd_rawdata_record(const sd_log_record_t *rec) {
    (void)rec; return g_stale_obd;
}
static bool offline_queue_is_stale_firmware_record(const sd_log_record_t *rec) {
    (void)rec; return g_stale_firmware;
}
static int sd_log_store_set_replay_seq(uint32_t seq) {
    (void)seq; return g_cursor_rc;
}
static int sd_log_store_ack_critical_and_advance_replay(uint32_t seq, uint32_t next) {
    (void)seq; (void)next; return g_firmware_ack_rc;
}
static int offline_queue_publish_record(const sd_log_record_t *rec) {
    (void)rec;
    g_published++;
    return g_publish_rc;
}
static void telemetry_counters_inc_replay_retry(void) { g_retry_count++; }
static void telemetry_counters_inc_replay_drop(void) { g_dropped++; }
static void telemetry_counters_inc_replay_success(void) { g_firmware_success++; }
static retry_policy_t offline_queue_replay_retry_policy(void) {
    return (retry_policy_t){0};
}
static uint32_t retry_state_current_delay_ms(
    retry_state_t *state, const retry_policy_t *policy, uint64_t now
) { (void)state; (void)policy; (void)now; return 100; }
static int retry_state_schedule(
    retry_state_t *state, const retry_policy_t *policy, uint64_t now, int error
) {
    (void)policy; (void)now; (void)error;
    state->attempts++;
    g_retry_scheduled++;
    return ESP_OK;
}
static void retry_state_reset(retry_state_t *state) { state->attempts = 0; }
static const char *esp_err_to_name(int err) { (void)err; return "ESP_FAIL"; }
"""

    checks = r"""
static void reset(void) {
    memset(&s_ctx, 0, sizeof(s_ctx));
    s_ctx.initialized = true;
    s_ctx.online = true;
    g_cursor_rc = ESP_OK;
    g_firmware_ack_rc = ESP_OK;
    g_publish_rc = ESP_OK;
    g_stale_obd = false;
    g_stale_firmware = false;
    g_acked_critical = false;
    g_published = g_retry_count = g_retry_scheduled = 0;
    g_dropped = g_firmware_success = 0;
}

int main(void) {
    reset();
    g_stale_obd = true;
    g_cursor_rc = ESP_FAIL;
    offline_queue_replay_tick();
    assert(g_published == 0);
    assert(g_dropped == 0);
    assert(g_retry_count == 1 && g_retry_scheduled == 1);

    reset();
    g_stale_obd = true;
    offline_queue_replay_tick();
    assert(g_published == 0);
    assert(g_dropped == 1);
    assert(g_retry_count == 0);

    reset();
    g_acked_critical = true;
    g_cursor_rc = ESP_FAIL;
    offline_queue_replay_tick();
    assert(g_published == 0);
    assert(g_retry_count == 1 && g_retry_scheduled == 1);

    reset();
    g_stale_firmware = true;
    g_firmware_ack_rc = ESP_FAIL;
    offline_queue_replay_tick();
    assert(g_published == 0);
    assert(g_retry_count == 1 && g_retry_scheduled == 1);

    reset();
    offline_queue_replay_tick();
    assert(g_published == 1);
    assert(g_retry_count == 0);
    return 0;
}
"""
    with tempfile.TemporaryDirectory() as directory:
        binary = Path(directory) / "offline_queue_replay_test"
        command = ["gcc", "-std=c11", "-Wall", "-Wextra", "-x", "c", "-", "-o", str(binary)]
        build = subprocess.run(
            command, input=prelude + replay + checks, text=True, capture_output=True, check=False
        )
        assert build.returncode == 0, build.stderr
        run = subprocess.run([str(binary)], capture_output=True, text=True, check=False, timeout=10)
        assert run.returncode == 0, run.stderr or run.stdout
