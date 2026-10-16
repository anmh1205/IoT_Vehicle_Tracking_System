"""Run the actual SD recovery C functions against host disk and rename faults."""
import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "components/adapter-storage-sdmmc-fatfs/src/sd_log_store.c"


def extract(source: str, signature: str) -> str:
    begin = source.index(signature)
    depth = 0
    for index in range(source.index("{", begin), len(source)):
        if source[index] == "{":
            depth += 1
        elif source[index] == "}":
            depth -= 1
            if depth == 0:
                return source[begin:index + 1]
    raise ValueError(f"unbalanced C function {signature}")


def test_corrupt_live_backup_recovery_and_rename_faults(tmp_path: Path):
    gcc = shutil.which("gcc")
    if not gcc:
        pytest.skip("Host GCC unavailable; ESP-IDF cross-compile remains required")
    source = SOURCE.read_text(encoding="utf-8")
    helper = extract(source, "static esp_err_t sd_log_store_replace_corrupt_live(")
    meta = extract(source, "static esp_err_t sd_log_store_recover_meta_if_needed(void) {")
    data = extract(source, "static esp_err_t sd_log_store_recover_data_if_needed(void) {")

    filepaths = {
        "SD_LOG_META_PATH": tmp_path / "meta.live",
        "SD_LOG_META_TMP_PATH": tmp_path / "meta.tmp",
        "SD_LOG_META_BAK_PATH": tmp_path / "meta.bak",
        "SD_LOG_META_CORRUPT_PATH": tmp_path / "meta.corrupt",
        "SD_LOG_DATA_PATH": tmp_path / "data.live",
        "SD_LOG_DATA_TMP_PATH": tmp_path / "data.tmp",
        "SD_LOG_DATA_BAK_PATH": tmp_path / "data.bak",
        "SD_LOG_DATA_CORRUPT_PATH": tmp_path / "data.corrupt",
    }
    defines = "\n".join(
        f"#define {name} {json.dumps(filepath.as_posix())}"
        for name, filepath in filepaths.items()
    )
    prefix = r"""
#include <assert.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#define ESP_OK 0
#define ESP_FAIL -1
#define ESP_ERR_INVALID_STATE -2
#define ESP_ERR_INVALID_SIZE -3
typedef int esp_err_t;
#define ESP_LOGE(...) ((void)0)
#define ESP_LOGW(...) ((void)0)
""" + defines + r"""
static bool degraded = false;
static bool fail_primary_promotion = false;
static bool fail_quarantine_move = false;
static void sd_log_store_mark_degraded(void) { degraded = true; }
static void sd_log_store_reset_peek_cache(void) {}
static bool valid_snapshot(const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) return false;
    char buf[16] = {0};
    size_t n = fread(buf, 1, sizeof(buf), f);
    int closed = fclose(f);
    return closed == 0 && n == 6 && memcmp(buf, "VALID\n", 6) == 0;
}
static bool sd_log_store_meta_candidate_valid(const char *p) { return valid_snapshot(p); }
static bool sd_log_store_data_candidate_valid(const char *p) { return valid_snapshot(p); }
static int host_rename(const char *from, const char *to) {
    bool promote = (strcmp(to, SD_LOG_META_PATH) == 0 ||
                    strcmp(to, SD_LOG_DATA_PATH) == 0);
    bool quarantine = (strcmp(to, SD_LOG_META_CORRUPT_PATH) == 0 ||
                       strcmp(to, SD_LOG_DATA_CORRUPT_PATH) == 0);
    bool rollback_from_quarantine =
        strcmp(from, SD_LOG_META_CORRUPT_PATH) == 0 ||
        strcmp(from, SD_LOG_DATA_CORRUPT_PATH) == 0;
    if ((promote && fail_primary_promotion && !rollback_from_quarantine) ||
        (quarantine && fail_quarantine_move)) return -1;
    return rename(from, to);
}
#define rename host_rename
"""
    suffix = r"""
static void write_file(const char *path, const char *value) {
    FILE *f = fopen(path, "wb");
    assert(f);
    assert(fwrite(value, 1, strlen(value), f) == strlen(value));
    assert(fclose(f) == 0);
}
static void clear_files(void) {
    remove(SD_LOG_META_PATH); remove(SD_LOG_META_TMP_PATH);
    remove(SD_LOG_META_BAK_PATH); remove(SD_LOG_META_CORRUPT_PATH);
    remove(SD_LOG_DATA_PATH); remove(SD_LOG_DATA_TMP_PATH);
    remove(SD_LOG_DATA_BAK_PATH); remove(SD_LOG_DATA_CORRUPT_PATH);
    degraded = fail_primary_promotion = fail_quarantine_move = false;
}
static bool exists(const char *path) {
    struct stat st = {0}; return stat(path, &st) == 0;
}
int main(void) {
    // Backup beats a partial tmp; corrupt live is quarantined, not deleted.
    clear_files();
    write_file(SD_LOG_DATA_PATH, "BROKEN\n");
    write_file(SD_LOG_DATA_BAK_PATH, "VALID\n");
    write_file(SD_LOG_DATA_TMP_PATH, "PARTIAL");
    assert(sd_log_store_recover_data_if_needed() == ESP_OK);
    assert(valid_snapshot(SD_LOG_DATA_PATH));
    assert(exists(SD_LOG_DATA_CORRUPT_PATH));
    assert(exists(SD_LOG_DATA_TMP_PATH));
    assert(!exists(SD_LOG_DATA_BAK_PATH));
    assert(sd_log_store_recover_data_if_needed() == ESP_OK);
    assert(!exists(SD_LOG_DATA_TMP_PATH));
    assert(exists(SD_LOG_DATA_CORRUPT_PATH));

    // A completely written tmp also works when no backup is present.
    clear_files();
    write_file(SD_LOG_META_PATH, "BROKEN\n");
    write_file(SD_LOG_META_TMP_PATH, "VALID\n");
    assert(sd_log_store_recover_meta_if_needed() == ESP_OK);
    assert(valid_snapshot(SD_LOG_META_PATH));
    assert(exists(SD_LOG_META_CORRUPT_PATH));

    // When all candidates are invalid, preserve all artifacts and report error.
    clear_files();
    write_file(SD_LOG_DATA_PATH, "BROKEN\n");
    write_file(SD_LOG_DATA_BAK_PATH, "PARTIAL");
    write_file(SD_LOG_DATA_TMP_PATH, "BAD");
    assert(sd_log_store_recover_data_if_needed() == ESP_ERR_INVALID_SIZE);
    assert(degraded && exists(SD_LOG_DATA_PATH) && exists(SD_LOG_DATA_BAK_PATH));
    assert(!exists(SD_LOG_DATA_CORRUPT_PATH));

    // If an older quarantine exists, never overwrite forensic evidence.
    clear_files();
    write_file(SD_LOG_META_PATH, "BROKEN\n");
    write_file(SD_LOG_META_BAK_PATH, "VALID\n");
    write_file(SD_LOG_META_CORRUPT_PATH, "PREVIOUS");
    assert(sd_log_store_recover_meta_if_needed() == ESP_ERR_INVALID_STATE);
    assert(exists(SD_LOG_META_PATH) && exists(SD_LOG_META_BAK_PATH));

    // Failure to move the corrupt primary leaves validated backup untouched.
    clear_files();
    write_file(SD_LOG_DATA_PATH, "BROKEN\n");
    write_file(SD_LOG_DATA_BAK_PATH, "VALID\n");
    fail_quarantine_move = true;
    assert(sd_log_store_recover_data_if_needed() == ESP_FAIL);
    assert(exists(SD_LOG_DATA_PATH) && valid_snapshot(SD_LOG_DATA_BAK_PATH));
    fail_quarantine_move = false;

    // Failed promotion rolls back invalid live; valid backup survives retry.
    fail_primary_promotion = true;
    assert(sd_log_store_recover_data_if_needed() == ESP_FAIL);
    assert(exists(SD_LOG_DATA_PATH) && valid_snapshot(SD_LOG_DATA_BAK_PATH));
    fail_primary_promotion = false;
    assert(sd_log_store_recover_data_if_needed() == ESP_OK);
    assert(valid_snapshot(SD_LOG_DATA_PATH));

    clear_files();
    return 0;
}
"""
    test_c = tmp_path / "sd_corrupt_live_recovery.c"
    executable = tmp_path / ("sd_corrupt_live_recovery.exe" if os.name == "nt" else "sd_corrupt_live_recovery")
    test_c.write_text(prefix + helper + "\n" + meta + "\n" + data + "\n" + suffix, encoding="utf-8")
    compile_result = subprocess.run(
        [gcc, "-std=c11", "-Wall", "-Wextra", "-Werror", str(test_c), "-o", str(executable)],
        capture_output=True, text=True,
    )
    assert compile_result.returncode == 0, compile_result.stderr
    subprocess.run([str(executable)], check=True, capture_output=True, text=True)
