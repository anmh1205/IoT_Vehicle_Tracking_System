/* Run: gcc -std=c11 -Wall -Wextra -Werror -I tests/host/stubs tests/host/test_ota_manual_rollback.c -o rollback_test && ./rollback_test */
#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "stubs/esp_ota_ops.h"

static esp_partition_t ota0 = { ESP_PARTITION_SUBTYPE_APP_OTA_0, "ota_0" };
static esp_partition_t ota1 = { ESP_PARTITION_SUBTYPE_APP_OTA_1, "ota_1" };
static esp_partition_t factory = { ESP_PARTITION_SUBTYPE_APP_FACTORY, "factory" };
static const esp_partition_t *running, *target, *last_attempt;
static int ota0_present, ota1_present, factory_present;
static esp_ota_img_states_t ota0_state, ota1_state;
static const esp_partition_t *reject_image;
static int set_boot_calls;

const esp_partition_t *esp_ota_get_running_partition(void) { return running; }
const esp_partition_t *esp_partition_find_first(int type, int subtype, const char *label) {
    (void)type;
    (void)label;
    if (subtype == ESP_PARTITION_SUBTYPE_APP_OTA_0) return ota0_present ? &ota0 : NULL;
    if (subtype == ESP_PARTITION_SUBTYPE_APP_OTA_1) return ota1_present ? &ota1 : NULL;
    if (subtype == ESP_PARTITION_SUBTYPE_APP_FACTORY) return factory_present ? &factory : NULL;
    return NULL;
}
esp_err_t esp_ota_get_state_partition(const esp_partition_t *p, esp_ota_img_states_t *state) {
    if (p == &ota0) *state = ota0_state;
    else if (p == &ota1) *state = ota1_state;
    else return ESP_ERR_NOT_FOUND;
    return ESP_OK;
}
esp_err_t esp_ota_set_boot_partition(const esp_partition_t *p) {
    ++set_boot_calls;
    last_attempt = p;
    if (p == reject_image) return ESP_FAIL;
    target = p;
    return ESP_OK;
}

#include "../../components/domain-ota/src/util_ota_rollback.c"

static void reset(void) {
    running = &ota0;
    target = NULL;
    last_attempt = NULL;
    reject_image = NULL;
    ota0_present = ota1_present = factory_present = 1;
    ota0_state = ota1_state = ESP_OTA_IMG_VALID;
    set_boot_calls = 0;
}
static firmware_status_t original_status(void) {
    firmware_status_t s = { 0 };
    util_copy_string(s.job_id, sizeof(s.job_id), "job-2026-XYZ");
    util_copy_string(s.target_version, sizeof(s.target_version), "1.2.3");
    util_copy_string(s.current_version, sizeof(s.current_version), "1.3.0");
    util_copy_string(s.status, sizeof(s.status), "assigned");
    util_copy_string(s.partition, sizeof(s.partition), "previous");
    s.progress = 25;
    return s;
}
static void assert_lineage(const firmware_status_t *s) {
    assert(strcmp(s->job_id, "job-2026-XYZ") == 0);
    assert(strcmp(s->target_version, "1.2.3") == 0);
    assert(strcmp(s->current_version, "1.3.0") == 0);
}
static void assert_rolled_back(const firmware_status_t *s, const char *name) {
    assert_lineage(s);
    assert(strcmp(s->status, "rolled_back") == 0);
    assert(strcmp(s->partition, name) == 0);
    assert(s->progress == TRACKER_OTA_PROGRESS_DONE);
}

static void test_verified_alternate(void) {
    reset();
    firmware_status_t s = original_status();
    assert(util_ota_trigger_manual_rollback(&s) == ESP_OK);
    assert(target == &ota1);
    assert(set_boot_calls == 1);
    assert_rolled_back(&s, "ota_1");
}
static void test_running_ota1_selects_ota0(void) {
    reset();
    running = &ota1;
    firmware_status_t s = original_status();
    assert(util_ota_trigger_manual_rollback(&s) == ESP_OK);
    assert(target == &ota0);
    assert_rolled_back(&s, "ota_0");
}
static void test_invalid_alternate_uses_factory(void) {
    reset();
    ota1_state = ESP_OTA_IMG_ABORTED;
    firmware_status_t s = original_status();
    assert(util_ota_trigger_manual_rollback(&s) == ESP_OK);
    assert(target == &factory);
    assert(set_boot_calls == 1);
    assert_rolled_back(&s, "factory");
}
static void test_corrupt_alternate_falls_back_to_factory(void) {
    reset();
    reject_image = &ota1;
    firmware_status_t s = original_status();
    assert(util_ota_trigger_manual_rollback(&s) == ESP_OK);
    assert(target == &factory);
    assert(set_boot_calls == 2);
    assert_rolled_back(&s, "factory");
}
static void test_no_valid_fallback_keeps_report(void) {
    reset();
    ota1_state = ESP_OTA_IMG_INVALID;
    factory_present = 0;
    firmware_status_t s = original_status();
    assert(util_ota_trigger_manual_rollback(&s) != ESP_OK);
    assert(target == NULL && set_boot_calls == 0);
    assert_lineage(&s);
    assert(strcmp(s.status, "assigned") == 0);
    assert(strcmp(s.partition, "previous") == 0);
    assert(s.progress == 25);
}
static void test_factory_running_never_boots_same_image(void) {
    reset();
    running = &factory;
    firmware_status_t s = original_status();
    assert(util_ota_trigger_manual_rollback(&s) == ESP_ERR_NOT_FOUND);
    assert(target == NULL && set_boot_calls == 0);
    assert_lineage(&s);
}
static void test_missing_running_partition_and_null_status(void) {
    reset();
    firmware_status_t s = original_status();
    running = NULL;
    assert(util_ota_trigger_manual_rollback(&s) == ESP_ERR_INVALID_STATE);
    assert(util_ota_trigger_manual_rollback(NULL) == ESP_ERR_INVALID_ARG);
    assert(set_boot_calls == 0);
    assert_lineage(&s);
}
int main(void) {
    test_verified_alternate();
    test_running_ota1_selects_ota0();
    test_invalid_alternate_uses_factory();
    test_corrupt_alternate_falls_back_to_factory();
    test_no_valid_fallback_keeps_report();
    test_factory_running_never_boots_same_image();
    test_missing_running_partition_and_null_status();
    puts("OTA manual rollback: 7/7 host scenarios passed");
    return 0;
}
