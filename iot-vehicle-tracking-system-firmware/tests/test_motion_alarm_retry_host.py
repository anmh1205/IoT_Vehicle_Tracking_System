"""Exercise production motion-alarm persistence, retry and reboot C flow on host.

Faults are injected only at NVS/MQTT/SD boundaries. This exercises the real
state_machine_stage/retry/restore implementations rather than matching strings.
"""
from pathlib import Path
import os
import shutil
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "components/app-core/src/state_publish_pipeline.c"


def extract(source: str, signature: str) -> str:
    start = source.index(signature)
    level = 0
    for idx in range(source.index("{", start), len(source)):
        if source[idx] == "{":
            level += 1
        elif source[idx] == "}":
            level -= 1
            if level == 0:
                return source[start:idx + 1]
    raise ValueError("Unbalanced function")


def test_actual_motion_alarm_c_retries_across_broker_sd_nvs_failures(tmp_path: Path):
    gcc = shutil.which("gcc")
    if not gcc:
        pytest.skip("Host GCC unavailable; ESP32 hardware gate still required")
    source = SOURCE.read_text(encoding="utf-8")
    restore = extract(source, "esp_err_t state_machine_restore_pending_motion_alarm(void) {")
    retry = extract(source, "void state_machine_retry_pending_motion_alarm(void) {")
    stage = extract(source, "void state_machine_stage_motion_alarm(void) {")
    pending = extract(source, "bool state_machine_has_pending_motion_alarm(void) {")

    harness = r"""
#include <assert.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define ESP_OK 0
#define ESP_FAIL (-1)
typedef int esp_err_t;
#define ESP_LOGE(...) ((void)0)
#define ESP_LOGW(...) ((void)0)
#define UINT64_C(value) value##ULL
#define OFFLINE_RECORD_EVENT 1
#define TRACKER_MOTION_ALARM_MAGIC 0x4D4F5431U
#define TRACKER_MOTION_ALARM_RETRY_MS 5000ULL
typedef struct { int dummy; } config_t;
typedef struct { struct { bool fix_valid; } gnss; } telemetry_t;
typedef struct {
  uint32_t magic, seq_no;
  uint64_t timestamp_ms;
  bool time_trusted;
  char message_id[37], boot_id[48];
} tracker_motion_alarm_checkpoint_t;
static config_t s_config;
static telemetry_t s_telemetry;
static uint64_t s_event_timestamp_ms;
static bool s_time_trusted = true;
static char s_boot_id[48] = "BOOT-1";
static uint64_t s_now_ms = 10000;
static unsigned s_next_seq, s_created_id_count, s_mqtt_attempts, s_sd_attempts, s_clear_attempts;
static bool s_network_connected, s_mqtt_accept, s_sd_accept, s_nvs_save_accept = true;
static bool s_nvs_clear_accept = true, s_checkpoint_present;
static tracker_motion_alarm_checkpoint_t s_persisted;
static tracker_motion_alarm_checkpoint_t s_motion_alarm_checkpoint;
static bool s_motion_alarm_pending, s_motion_alarm_in_nvs, s_motion_alarm_delivery_accepted;
static uint64_t s_motion_alarm_next_retry_ms;
static char s_last_payload[200];
static uint64_t util_uptime_ms(void) { return s_now_ms; }
static void state_machine_update_time_source(void) {
    s_event_timestamp_ms = s_now_ms;
    s_time_trusted = true;
}
static uint32_t state_machine_next_seq_no(void) { return ++s_next_seq; }
static void state_machine_fill_message_id(char *dst, size_t size) {
    ++s_created_id_count;
    snprintf(dst, size, "unique-motion-%u", s_created_id_count);
}
static void util_copy_string(char *dst, size_t size, const char *src) {
    snprintf(dst, size, "%s", src);
}
static esp_err_t nvs_config_save_motion_alarm(const tracker_motion_alarm_checkpoint_t *ckpt) {
    if (!s_nvs_save_accept) return ESP_FAIL;
    s_persisted = *ckpt; s_checkpoint_present = true;
    return ESP_OK;
}
static esp_err_t nvs_config_load_motion_alarm(tracker_motion_alarm_checkpoint_t *out, bool *found) {
    *found = s_checkpoint_present;
    if (*found) *out = s_persisted;
    return ESP_OK;
}
static esp_err_t nvs_config_clear_motion_alarm(void) {
    ++s_clear_attempts;
    if (!s_nvs_clear_accept) return ESP_FAIL;
    s_checkpoint_present = false;
    return ESP_OK;
}
static char *data_format_event(const config_t *config, const char *severity,
    int code, const char *kind, bool include_token, bool trusted,
    uint64_t timestamp, const char *id, uint32_t seq, const char *boot) {
    (void)config; (void)severity; (void)code; (void)kind;
    (void)include_token; (void)trusted;
    char *result = malloc(200);
    assert(result);
    snprintf(result, 200, "mid=%s;time=%llu;seq=%u;boot=%s", id,
             (unsigned long long)timestamp, seq, boot);
    return result;
}
static bool tracker_mqtt_is_connected(void) { return s_network_connected; }
static esp_err_t tracker_mqtt_publish_event(const char *payload) {
    ++s_mqtt_attempts;
    snprintf(s_last_payload, sizeof(s_last_payload), "%s", payload);
    return s_mqtt_accept ? ESP_OK : ESP_FAIL;
}
static esp_err_t offline_queue_enqueue(int kind, const char *payload,
   bool has_fix, bool is_online, bool timestamp_trusted, uint64_t timestamp) {
    (void)kind; (void)has_fix; (void)is_online;
    (void)timestamp_trusted; (void)timestamp;
    ++s_sd_attempts;
    snprintf(s_last_payload, sizeof(s_last_payload), "%s", payload);
    return s_sd_accept ? ESP_OK : ESP_FAIL;
}
static void telemetry_counters_inc_mqtt_publish_ok(void) {}
static void telemetry_counters_inc_mqtt_publish_fail(void) {}
static void telemetry_counters_inc_mqtt_publish_fallback(void) {}
static void cJSON_free(void *p) { free(p); }
""" + "\n" + pending + "\n" + restore + "\n" + retry + "\n" + stage + r"""
static void reset_case(uint64_t now) {
    s_now_ms = now;
    s_next_seq = s_created_id_count = s_mqtt_attempts = s_sd_attempts = s_clear_attempts = 0;
    s_network_connected = s_mqtt_accept = s_sd_accept = false;
    s_nvs_save_accept = s_nvs_clear_accept = true;
    s_checkpoint_present = false;
    s_motion_alarm_pending = s_motion_alarm_in_nvs = s_motion_alarm_delivery_accepted = false;
    s_motion_alarm_next_retry_ms = 0;
    memset(&s_motion_alarm_checkpoint, 0, sizeof(s_motion_alarm_checkpoint));
    memset(&s_persisted, 0, sizeof(s_persisted));
    memset(s_last_payload, 0, sizeof(s_last_payload));
}
int main(void) {
    // Both transports unavailable; retain one durable identity and retry later.
    reset_case(10000);
    state_machine_stage_motion_alarm();
    assert(state_machine_has_pending_motion_alarm());
    assert(s_checkpoint_present && s_motion_alarm_in_nvs);
    assert(s_created_id_count == 1 && s_sd_attempts == 1);
    const uint64_t first_time = s_persisted.timestamp_ms;
    char first_id[37];
    strcpy(first_id, s_persisted.message_id);
    state_machine_stage_motion_alarm(); // coalesced repeated alarm
    assert(s_created_id_count == 1);
    s_now_ms = 14999;
    state_machine_retry_pending_motion_alarm();
    assert(s_sd_attempts == 1);
    s_now_ms = 15000;
    s_sd_accept = true;
    state_machine_retry_pending_motion_alarm();
    assert(!state_machine_has_pending_motion_alarm() && !s_checkpoint_present);
    assert(strstr(s_last_payload, first_id) && first_time == 10000);

    // MQTT acceptance must not be duplicated when NVS clear fails once.
    reset_case(20000);
    state_machine_stage_motion_alarm();
    s_network_connected = s_mqtt_accept = true;
    s_now_ms = 25000;
    s_nvs_clear_accept = false;
    state_machine_retry_pending_motion_alarm();
    assert(s_motion_alarm_delivery_accepted && state_machine_has_pending_motion_alarm());
    assert(s_mqtt_attempts == 1 && s_checkpoint_present);
    s_nvs_clear_accept = true;
    s_now_ms = 30000;
    state_machine_retry_pending_motion_alarm();
    assert(s_mqtt_attempts == 1 && !state_machine_has_pending_motion_alarm());
    assert(!s_checkpoint_present && s_clear_attempts == 2);

    // Simulate reset after first failed delivery: load original NVS identity,
    // then deliver exact original timestamp and ID after connectivity returns.
    reset_case(40000);
    state_machine_stage_motion_alarm();
    char expected_id[37]; strcpy(expected_id, s_persisted.message_id);
    const uint64_t expected_time = s_persisted.timestamp_ms;
    s_motion_alarm_pending = s_motion_alarm_in_nvs = false;
    memset(&s_motion_alarm_checkpoint, 0, sizeof(s_motion_alarm_checkpoint));
    assert(state_machine_restore_pending_motion_alarm() == ESP_OK);
    assert(s_motion_alarm_pending && s_motion_alarm_in_nvs);
    s_now_ms = 45000;
    s_network_connected = s_mqtt_accept = true;
    state_machine_retry_pending_motion_alarm();
    assert(!state_machine_has_pending_motion_alarm());
    assert(strstr(s_last_payload, expected_id) && strstr(s_last_payload, "time=40000"));
    assert(s_created_id_count == 1 && expected_time == 40000);

    // NVS failure cannot clear an unsent alarm from RAM.
    reset_case(50000);
    s_nvs_save_accept = false;
    state_machine_stage_motion_alarm();
    assert(state_machine_has_pending_motion_alarm() && !s_checkpoint_present);
    s_now_ms = 55000;
    s_sd_accept = true; // SD is a durable fallback even if NVS is unavailable
    state_machine_retry_pending_motion_alarm();
    assert(!state_machine_has_pending_motion_alarm() && s_sd_attempts == 2);
    return 0;
}
""";
    test_c = tmp_path / "motion_alarm_host.c"
    binary = tmp_path / ("motion_alarm_host.exe" if os.name == "nt" else "motion_alarm_host")
    test_c.write_text(harness, encoding="utf-8")
    compiled = subprocess.run(
        [gcc, "-std=c11", "-Wall", "-Wextra", "-Werror", str(test_c), "-o", str(binary)],
        capture_output=True, text=True,
    )
    assert compiled.returncode == 0, compiled.stderr
    subprocess.run([str(binary)], check=True, capture_output=True, text=True)
