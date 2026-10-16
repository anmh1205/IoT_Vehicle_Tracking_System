"""Exercise the actual C SD garbage collector against host files and I/O faults."""
import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "components/adapter-storage-sdmmc-fatfs/src/sd_log_store.c"


def extract_c_function(source: str, signature: str) -> str:
    start = source.index(signature)
    level = 0
    for i in range(source.index("{", start), len(source)):
        if source[i] == "{":
            level += 1
        elif source[i] == "}":
            level -= 1
            if level == 0:
                return source[start:i + 1]
    raise ValueError("Unterminated C function")


def test_gc_preserves_original_on_corrupt_tail_read_failure_and_flush_failure(tmp_path: Path):
    gcc = shutil.which("gcc")
    if not gcc:
        pytest.skip("GCC unavailable")
    source = SOURCE.read_text(encoding="utf-8")
    line_guard = extract_c_function(
        source, "static bool sd_log_store_line_complete(const char *line) {"
    )
    gc = extract_c_function(source, "esp_err_t sd_log_store_gc_if_needed(void) {")
    paths = [tmp_path / name for name in ("queue.log", "queue.tmp", "queue.bak")]

    header = r"""
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define SD_LOG_DATA_PATH $DATA
#define SD_LOG_DATA_TMP_PATH $TEMP
#define SD_LOG_DATA_BAK_PATH $BACKUP
#define SD_LOG_LINE_MAX 256
#define CONFIG_TRACKER_SD_LOG_HARD_QUOTA_PERCENT 50
#define ESP_OK 0
#define ESP_FAIL (-1)
#define ESP_ERR_INVALID_STATE (-2)
#define ESP_ERR_INVALID_SIZE (-3)
#define TAG "SD_GC_TEST"
#define ESP_RETURN_ON_FALSE(cond, error, tag, ...) \
  do { if (!(cond)) return error; } while (0)
#define ESP_LOGW(...) ((void)0)
#define ESP_LOGE(...) ((void)0)
typedef int esp_err_t;
typedef struct { size_t bytes_used, quota_bytes; } sd_log_stats_t;
typedef struct { uint32_t seq; unsigned char critical; } sd_log_record_t;
static struct {
    bool mounted;
    struct { uint32_t ack_seq_critical; } meta;
} s_ctx = {.mounted = true};
static bool degraded, force_flush_failure, force_read_error;
static int cache_resets;
static esp_err_t sd_log_store_get_stats(sd_log_stats_t *stats) {
    stats->bytes_used = 300;
    stats->quota_bytes = 100;
    return ESP_OK;
}
static void telemetry_counters_inc_quota_hit(void) {}
static void telemetry_counters_inc_sd_write_fail(void) {}
static void telemetry_counters_inc_sd_fsync_fail(void) {}
static void sd_log_store_mark_degraded(void) { degraded = true; }
static void sd_log_store_reset_peek_cache(void) { ++cache_resets; }
static esp_err_t sd_log_store_parse_record(
    const char *line, sd_log_record_t *record) {
    const char *delim = strchr(line, '|');
    if (delim == NULL || strcmp(delim, "|VALID\n") != 0) return ESP_FAIL;
    record->seq = (uint32_t)strtoul(line, NULL, 10);
    record->critical = 1;
    return ESP_OK;
}
static int host_flush(FILE *stream) {
    return force_flush_failure ? EOF : fflush(stream);
}
static int host_read_error(FILE *stream) {
    return force_read_error ? 1 : ferror(stream);
}
static int host_file_descriptor(FILE *stream) { (void)stream; return 1; }
static int host_sync(int fd) { (void)fd; return 0; }
#define fflush host_flush
#define ferror host_read_error
#define fileno host_file_descriptor
#define fsync host_sync
"""
    for marker, p in zip(("$DATA", "$TEMP", "$BACKUP"), paths):
        header = header.replace(marker, json.dumps(p.as_posix()))

    footer = r"""
static void clear_files(void) {
    remove(SD_LOG_DATA_PATH);
    remove(SD_LOG_DATA_TMP_PATH);
    remove(SD_LOG_DATA_BAK_PATH);
    degraded = false;
    cache_resets = 0;
}
static void write_log(const char *value) {
    FILE *stream = fopen(SD_LOG_DATA_PATH, "wb");
    assert(stream != NULL);
    assert(fwrite(value, 1, strlen(value), stream) == strlen(value));
    assert(fclose(stream) == 0);
}
static void assert_log_equal(const char *want) {
    char actual[256] = {0};
    FILE *stream = fopen(SD_LOG_DATA_PATH, "rb");
    assert(stream != NULL);
    const size_t count = fread(actual, 1, sizeof(actual) - 1, stream);
    assert(fclose(stream) == 0);
    actual[count] = '\0';
    assert(strcmp(actual, want) == 0);
}
static void assert_no_staging(void) {
    FILE *stream = fopen(SD_LOG_DATA_TMP_PATH, "rb");
    assert(stream == NULL);
}
int main(void) {
    clear_files();
    write_log("1|VALID\n2|INCOMPLETE");
    assert(sd_log_store_gc_if_needed() == ESP_ERR_INVALID_SIZE);
    assert_log_equal("1|VALID\n2|INCOMPLETE");
    assert_no_staging();
    assert(degraded);

    clear_files();
    write_log("1|VALID\n2|BAD\n");
    assert(sd_log_store_gc_if_needed() == ESP_ERR_INVALID_SIZE);
    assert_log_equal("1|VALID\n2|BAD\n");
    assert_no_staging();

    clear_files();
    write_log("1|VALID\n2|VALID\n");
    force_read_error = true;
    assert(sd_log_store_gc_if_needed() == ESP_ERR_INVALID_SIZE);
    force_read_error = false;
    assert_log_equal("1|VALID\n2|VALID\n");
    assert_no_staging();

    clear_files();
    write_log("1|VALID\n2|VALID\n");
    force_flush_failure = true;
    assert(sd_log_store_gc_if_needed() == ESP_FAIL);
    force_flush_failure = false;
    assert_log_equal("1|VALID\n2|VALID\n");
    assert_no_staging();

    clear_files();
    write_log("1|VALID\n2|VALID\n");
    assert(sd_log_store_gc_if_needed() == ESP_OK);
    assert_log_equal("1|VALID\n2|VALID\n");
    assert_no_staging();
    assert(cache_resets == 1);
    clear_files();
    return 0;
}
"""
    harness = tmp_path / "gc_harness.c"
    harness.write_text(
        header + "\n" + line_guard + "\n" + gc + "\n" + footer,
        encoding="utf-8",
    )
    binary = tmp_path / ("gc_harness.exe" if __import__("os").name == "nt" else "gc_harness")
    result = subprocess.run(
        [gcc, "-std=c11", "-Wall", "-Wextra", "-Werror",
         str(harness), "-o", str(binary)],
        capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stderr
    subprocess.run([str(binary)], check=True, capture_output=True, text=True)
