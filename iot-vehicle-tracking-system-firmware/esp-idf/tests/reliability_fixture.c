#include "esp_timer.h"
#include <assert.h>
#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#include "at/at_engine.h"
#include "app_msg_seq.h"
#include "session/session_tracker.h"
#include "board/board.h"
#include "elm/elm327.h"
#include "ivts_core/model/record.h"
#include "ivts_core/ota/confirm.h"
#include "at/at_dispatch.h"
#include "at/at_parser.h"
#include "link/modem_link.h"
#include "modem_internal.h"
#include "mqtt/mqtt_rx.h"
#include "mqtt/mqtt_session.h"
#include "slots/modem_slots.h"
#include "elm/obd_pid.h"
#include "storage_internal.h"
#include "queue/queue.h"
#include "queue/queue_frame.h"
#include "persist/app_records.h"

#define FIRST "sd/q/Q0000000.BIN"
#define SECOND "sd/q/Q0000001.BIN"

static storage_cfg_t s_storage_cfg;
const storage_cfg_t *storage_config_view(void) { return &s_storage_cfg; }
void storage_emit(const ivts_event_t *ev) { assert(ev->type == IVTS_EV_QUEUE_READY); }

static const char *s_fail_read;
static bool s_fail_remove, s_fail_truncate, s_short_write;

static ivts_session_state_t s_persisted_session;
static bool s_fail_session_save;
static uint32_t s_seq;
static uint64_t s_now;
static size_t s_expected_raw;
static unsigned s_seen_commands;

int64_t esp_timer_get_time(void) { return (int64_t)(s_now * 1000u); }
uint32_t app_msg_seq_next(void) { return ++s_seq; }
ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted)
{
    *unix_ms = UINT64_C(1795430400000) + s_now;
    *trusted = true;
    return IVTS_OK;
}

ivts_err_t app_records_session_save(const ivts_session_state_t *state)
{
    if (s_fail_session_save) { return IVTS_ERR_IO; }
    s_persisted_session = *state;
    return IVTS_OK;
}

void modem_expect_raw(size_t len) { s_expected_raw = len; }
void modem_link_on_connection_lost(void) {}
const char *modem_command_topic(void) { return "cmd"; }

void modem_cmd_store(const char *payload, size_t len)
{
    assert(len == 4u && memcmp(payload, "true", len) == 0);
    s_seen_commands++;
}

FILE *__real_fopen(const char *path, const char *mode);
int __real_remove(const char *path);
int __real_truncate(const char *path, off_t length);
size_t __real_fwrite(const void *ptr, size_t size, size_t count, FILE *stream);

FILE *__wrap_fopen(const char *path, const char *mode)
{
    if (s_fail_read != NULL && strcmp(path, s_fail_read) == 0 && strcmp(mode, "rb") == 0) {
        errno = EIO;
        return NULL;
    }
    return __real_fopen(path, mode);
}

int __wrap_remove(const char *path)
{
    if (s_fail_remove && strcmp(path, FIRST) == 0) {
        errno = EIO;
        return -1;
    }
    return __real_remove(path);
}

int __wrap_truncate(const char *path, off_t length)
{
    if (s_fail_truncate) {
        errno = EIO;
        return -1;
    }
    return __real_truncate(path, length);
}

size_t __wrap_fwrite(const void *ptr, size_t size, size_t count, FILE *stream)
{
    if (s_short_write && size == 1u && count == IVTS_RECORD_MAX_SIZE + 6u) {
        s_short_write = false;
        return __real_fwrite(ptr, size, count / 2u, stream);
    }
    return __real_fwrite(ptr, size, count, stream);
}

static void open_queue(uint32_t segment_bytes)
{
    s_storage_cfg.queue_max_segments = 2;
    s_storage_cfg.queue_segment_bytes = segment_bytes;
    assert(mkdir("sd", 0700) == 0);
    storage_queue_slot_init();
    assert(storage_queue_open() == ESP_OK);
}

static ivts_err_t push(uint8_t value)
{
    uint8_t data[IVTS_RECORD_MAX_SIZE] = {value};
    return storage_queue_do_push(data, sizeof data);
}

static uint32_t peek(uint8_t expected)
{
    assert(storage_queue_do_peek() == IVTS_OK);
    uint8_t data[IVTS_RECORD_MAX_SIZE];
    uint32_t token;
    size_t len;
    assert(storage_queue_peek_copy(data, sizeof data, &len, &token) == IVTS_OK);
    assert(len == sizeof data && data[0] == expected && token != 0u);
    return token;
}

static void check_eviction_with_delayed_ack(void)
{
    open_queue(IVTS_RECORD_MAX_SIZE + 6u);
    assert(push(1) == IVTS_OK && push(2) == IVTS_OK);
    uint32_t old = peek(1);
    s_fail_remove = true;
    assert(push(3) == IVTS_ERR_IO);
    assert(storage_queue_count() == 2u && peek(1) == old);
    s_fail_remove = false;
    assert(push(3) == IVTS_OK && storage_queue_count() == 2u);
    assert(storage_queue_do_pop(old) == IVTS_ERR_NOT_FOUND);
    assert(storage_queue_count() == 2u);
    assert(storage_queue_do_pop(peek(2)) == IVTS_OK);
    assert(storage_queue_do_pop(peek(3)) == IVTS_OK);
    assert(storage_queue_open() == ESP_OK && storage_queue_count() == 0u);
}

static void check_read_error(void)
{
    open_queue(IVTS_RECORD_MAX_SIZE + 6u);
    assert(push(1) == IVTS_OK && push(2) == IVTS_OK);
    s_fail_read = FIRST;
    assert(storage_queue_do_peek() == IVTS_ERR_IO);
    assert(storage_queue_count() == 2u && access(FIRST, F_OK) == 0);
    s_fail_read = SECOND;
    assert(storage_queue_open() != ESP_OK);
    assert(access(FIRST, F_OK) == 0 && access(SECOND, F_OK) == 0);
    s_fail_read = NULL;
    assert(storage_queue_open() == ESP_OK && storage_queue_count() == 2u);
    assert(storage_queue_do_pop(peek(1)) == IVTS_OK);
    assert(storage_queue_do_pop(peek(2)) == IVTS_OK);
}

static void check_partial_append(void)
{
    open_queue(3u * (IVTS_RECORD_MAX_SIZE + 6u));
    assert(push(1) == IVTS_OK);
    s_short_write = true;
    s_fail_truncate = true;
    assert(push(2) == IVTS_ERR_IO && storage_queue_count() == 1u);
    assert(push(3) == IVTS_ERR_IO && storage_queue_count() == 1u);
    s_fail_truncate = false;
    assert(push(3) == IVTS_OK && storage_queue_count() == 2u);
    FILE *f = __real_fopen(FIRST, "ab");
    assert(f != NULL && fputc(0xa5, f) != EOF && fclose(f) == 0);
    s_fail_truncate = true;
    assert(storage_queue_open() != ESP_OK);
    s_fail_truncate = false;
    assert(storage_queue_open() == ESP_OK && storage_queue_count() == 2u);
    assert(storage_queue_do_pop(peek(1)) == IVTS_OK);
    assert(storage_queue_do_pop(peek(3)) == IVTS_OK);
}

static void check_sparse_segments(void)
{
    open_queue(IVTS_RECORD_MAX_SIZE + 6u);
    assert(push(1) == IVTS_OK && push(2) == IVTS_OK);
    assert(rename(SECOND, "sd/q/Q8000000.BIN") == 0);
    FILE *backup = fopen("sd/q/Q9999999.TMP", "wb");
    assert(backup != NULL && fclose(backup) == 0);
    assert(storage_queue_open() == ESP_OK && storage_queue_count() == 2u);
    assert(storage_queue_do_pop(peek(1)) == IVTS_OK);
    assert(storage_queue_do_pop(peek(2)) == IVTS_OK);
    assert(push(3) == IVTS_OK && storage_queue_do_pop(peek(3)) == IVTS_OK);
}

static void tx(void *ctx, const void *bytes, size_t len)
{
    (void)bytes;
    *(size_t *)ctx += len;
}

static void check_uart(void)
{
    at_parser_t p;
    at_parser_init(&p);
    assert(at_parser_feed(&p, '>') == AT_UNIT_PROMPT);
    assert(at_parser_feed(&p, ' ') == AT_UNIT_NONE);
    assert(at_parser_feed(&p, 'O') == AT_UNIT_NONE);
    assert(at_parser_feed(&p, 'K') == AT_UNIT_NONE);
    assert(at_parser_feed(&p, '\r') == AT_UNIT_LINE && strcmp(p.buf, "OK") == 0);
    assert(at_parser_feed(&p, '\n') == AT_UNIT_NONE);
    for (size_t i = 0; i < AT_LINE_MAX + 2u; i++) { assert(at_parser_feed(&p, 'A') == AT_UNIT_NONE); }
    assert(at_parser_feed(&p, '\r') == AT_UNIT_NONE);
    assert(at_parser_feed(&p, 'X') == AT_UNIT_NONE);
    assert(at_parser_feed(&p, '\0') == AT_UNIT_NONE);
    assert(at_parser_feed(&p, '\n') == AT_UNIT_NONE);
    assert(at_parser_feed(&p, 'H') == AT_UNIT_NONE);
    assert(at_parser_feed(&p, '\r') == AT_UNIT_LINE);
    at_parser_expect_raw(&p, 2u);
    assert(at_parser_feed(&p, '\n') == AT_UNIT_NONE);   /* LF của header. */
    assert(at_parser_feed(&p, '\n') == AT_UNIT_NONE);   /* Byte đầu của vùng dữ liệu. */
    assert(at_parser_feed(&p, '\0') == AT_UNIT_DATA && p.len == 2u && p.buf[0] == '\n');
    int32_t v;
    assert(at_field_int("+X: -2147483648", 0, &v) && v == INT32_MIN);
    assert(!at_field_int("+X: 3 junk", 0, &v));

    at_engine_t e;
    size_t sent = 0;
    at_engine_init(&e, (at_tx_t){tx, &sent});
    at_cmd_t read = {
        .text = "AT+HTTPREAD=0,8", .final_prefix = "+HTTPREAD: 0", .final_exact = true, .timeout_ms = 100,
    };
    assert(at_engine_start(&e, &read, 0) == IVTS_OK);
    assert(!at_engine_on_line(&e, "+HTTPREAD: 08"));
    assert(at_engine_poll(&e, 1) == AT_RES_PENDING);
    assert(at_engine_on_line(&e, "+HTTPREAD: 0") && at_engine_poll(&e, 2) == AT_RES_OK);

    at_cmd_t payload = { .text = "AT+CMQTTPAYLOAD=0,1", .data = (const uint8_t *)"X", .data_len = 1, .timeout_ms = 100 };
    assert(at_engine_start(&e, &payload, 0) == IVTS_OK);
    assert(at_engine_on_line(&e, "OK") && at_engine_poll(&e, 1) == AT_RES_PENDING);
    size_t header_bytes = sent;
    at_engine_on_prompt(&e);
    at_engine_on_prompt(&e);
    assert(sent == header_bytes + 1u);
    assert(at_engine_on_line(&e, "OK") && at_engine_poll(&e, 2) == AT_RES_OK);
}

static void check_ota_deadline(void)
{
    ivts_ota_confirm_ctx_t pending = { .pending = true, .timeout_s = 60u, .deadline_unix_ms = 120000u };
    assert(ivts_ota_confirm_decide(&pending, true, 119999, true, 5000) == IVTS_CONFIRM_ACCEPT);
    assert(ivts_ota_confirm_decide(&pending, true, 120000, true, 5000) == IVTS_CONFIRM_ROLLBACK);
    assert(ivts_ota_confirm_decide(&pending, true, 100000, true, 60000) == IVTS_CONFIRM_ROLLBACK);
    assert(ivts_ota_confirm_decide(&pending, false, 200000, false, 59999) == IVTS_CONFIRM_WAIT);
    assert(ivts_ota_confirm_decide(&pending, false, 0, false, 60000) == IVTS_CONFIRM_ROLLBACK);
}

static void check_late_session_assignment(void)
{
    s_now = 10;
    s_fail_session_save = true;
    app_session_tick(IVTS_IGN_ON, true, 7u);
    assert(!app_session_has_unsent_boundary() && app_session_active_id()->local_key == 0u);
    s_now = 5010;
    s_fail_session_save = false;
    app_session_tick(IVTS_IGN_ON, true, 7u);
    const uint32_t key = app_session_active_id()->local_key;
    assert(key != 0u && s_persisted_session.count == 1u);
    app_session_tick(IVTS_IGN_OFF, true, 7u);
    assert(s_persisted_session.count == 2u && app_session_active_id()->local_key == 0u);
    assert(!app_session_assign(key, "00000008", 42u, NULL));
    s_fail_session_save = true;
    assert(!app_session_assign(key, "00000007", 42u, NULL));
    assert(s_persisted_session.outbox[1].session.canonical_id == 0u);
    s_fail_session_save = false;
    assert(app_session_assign(key, "00000007", 42u, NULL));
    assert(s_persisted_session.outbox[0].session.canonical_id == 0u);
    assert(s_persisted_session.outbox[1].session.canonical_id == 42u);
    assert(app_session_assign(key, "00000007", 42u, NULL));
    assert(!app_session_assign(key, "00000007", 99u, NULL));
}

static void check_queue_frame_codec(void)
{
    const uint8_t record[] = { 'a', 'b', 'c' };
    /* IEEE CRC32 over 03 61 62 63 is 0xf994e822. On disk CRC is little endian. */
    const uint8_t expected[] = { 0xA5, 0x03, 0x61, 0x62, 0x63, 0x22, 0xe8, 0x94, 0xf9 };
    uint8_t encoded[sizeof expected], decoded[sizeof record];
    size_t len = storage_queue_frame_encode(encoded, record, sizeof record);
    assert(len == sizeof expected && memcmp(encoded, expected, sizeof expected) == 0);
    assert(storage_queue_frame_decode(encoded, len, decoded, &len) == (int)sizeof expected);
    assert(len == sizeof record && memcmp(decoded, record, sizeof record) == 0);
    assert(storage_queue_frame_decode(encoded, sizeof encoded - 1u, NULL, NULL) == FRAME_CORRUPT);
    encoded[2] ^= 1u;
    assert(storage_queue_frame_decode(encoded, sizeof encoded, NULL, NULL) == FRAME_CORRUPT);
}

static void check_mqtt_connect_command(void)
{
    const modem_cfg_t config = { .mqtt_port = 1883, .mqtt_host = "broker.test",
                                 .mqtt_user = "test-user", .mqtt_pass = "test-password" };
    char command[128];
    const char expected[] = "AT+CMQTTCONNECT=0,\"tcp://broker.test:8883\",60,0,\"test-user\",\"test-password\"";
    assert(modem_mqtt_format_connect_cmd(command, sizeof command, &config, true));
    assert(strcmp(command, expected) == 0);
    assert(!modem_mqtt_format_connect_cmd(command, strlen(expected), &config, true));
    assert(modem_mqtt_format_connect_cmd(command, sizeof expected, &config, true));
}

static void check_mqtt_rx(void)
{
    modem_mqtt_rx_init();
    modem_mqtt_rx_on_urc("+CMQTTRXSTART:");
    modem_mqtt_rx_on_urc("0,3,4");
    modem_mqtt_rx_on_urc("+CMQTTRXTOPIC:");
    modem_mqtt_rx_on_urc("0,3");
    assert(s_expected_raw == 3u);
    modem_mqtt_rx_on_data((const uint8_t *)"cm", 2);
    modem_mqtt_rx_on_data((const uint8_t *)"d", 1);
    modem_mqtt_rx_on_urc("+CMQTTRXPAYLOAD: 0,4");
    assert(s_expected_raw == 4u);
    modem_mqtt_rx_on_data((const uint8_t *)"tr", 2);
    modem_mqtt_rx_on_data((const uint8_t *)"ue", 2);
    modem_mqtt_rx_on_urc("+CMQTTRXEND: 0");
    assert(s_seen_commands == 1u);

    modem_mqtt_rx_on_urc("+CMQTTRXSTART: 0,3,5");
    modem_mqtt_rx_on_urc("+CMQTTRXTOPIC: 0,3");
    modem_mqtt_rx_on_data((const uint8_t *)"cm", 2);
    modem_mqtt_rx_on_data((const uint8_t *)"d", 1);
    modem_mqtt_rx_on_urc("+CMQTTRXPAYLOAD: 0,4");
    modem_mqtt_rx_on_data((const uint8_t *)"tr", 2);
    modem_mqtt_rx_on_data((const uint8_t *)"ue", 2);
    modem_mqtt_rx_on_urc("+CMQTTRXEND: 0");
    assert(s_seen_commands == 1u);   /* Prefix JSON hợp lệ vẫn thiếu byte. */

    modem_mqtt_rx_on_urc("+CMQTTRXSTART: 1,3,4");
    modem_mqtt_rx_on_urc("+CMQTTRXTOPIC: 1,3");
    modem_mqtt_rx_on_data((const uint8_t *)"cmd", 3);
    modem_mqtt_rx_on_urc("+CMQTTRXPAYLOAD: 1,4");
    modem_mqtt_rx_on_data((const uint8_t *)"true", 4);
    modem_mqtt_rx_on_urc("+CMQTTRXEND: 1");
    assert(s_seen_commands == 1u);
}

static void check_obd(void)
{
    elm_rx_t reply;
    elm_rx_reset(&reply);
    const uint8_t first[] = "010C\rSEARCHING...\r41 0";
    const uint8_t last[] = {'C', ' ', '0', '0', ' ', '0', '0', '\0', '\r', '>'};
    assert(!elm_rx_feed(&reply, first, sizeof first - 1u));
    uint8_t data[64];
    size_t len;
    assert(elm_extract_bytes(reply.buf, 1u, data, sizeof data, &len) == IVTS_ERR_INVALID_ARG);
    assert(elm_rx_feed(&reply, last, sizeof last) && !reply.overflow);
    ivts_obd_sample_t sample = {0};
    assert(elm_extract_bytes(reply.buf, 1u, data, sizeof data, &len) == IVTS_OK);
    assert(obd_pid_decode(data, len, &sample) == IVTS_OK);
    assert(sample.valid_mask == IVTS_OBD_HAS_RPM && sample.rpm == 0u);

    ivts_obd_readiness_t readiness;
    assert(elm_extract_bytes("410181170101\r>", 1u, data, sizeof data, &len) == IVTS_OK);
    assert(obd_readiness_decode(data, len, &readiness) == IVTS_OK);
    assert(readiness.valid && readiness.mil_on && readiness.reported_dtc_count == 1u);

    ivts_dtc_list_t defects;
    assert(elm_extract_bytes("0: 43 02 01 71\r1: 04 20\r>", 3u, data, sizeof data, &len) == IVTS_OK);
    assert(obd_dtc_decode(data, len, &defects) == IVTS_OK && defects.count == 2u);
    assert(strcmp(defects.codes[0], "P0171") == 0 && strcmp(defects.codes[1], "P0420") == 0);
    assert(elm_reply_valid("\r OK  \r>", false, true));
    assert(!elm_reply_valid("OK extra\r>", false, true));
    assert(elm_reply_ecu_state("NO DATA\r>") == IVTS_ECU_NO_DATA);

    uint8_t too_long[ELM_REPLY_MAX];
    memset(too_long, 'A', sizeof too_long);
    elm_rx_reset(&reply);
    assert(!elm_rx_feed(&reply, too_long, sizeof too_long));
    assert(elm_rx_feed(&reply, last, sizeof last) && reply.overflow);
}

int main(int argc, char *argv[])
{
    const struct { const char *name; void (*check)(void); } cases[] = {
        {"frame", check_queue_frame_codec}, {"eviction", check_eviction_with_delayed_ack}, {"read_error", check_read_error},
        {"partial_append", check_partial_append}, {"sparse", check_sparse_segments},
        {"uart", check_uart}, {"ota", check_ota_deadline},
        {"session", check_late_session_assignment}, {"mqtt_rx", check_mqtt_rx}, {"obd", check_obd},
        {"mqtt_connect", check_mqtt_connect_command},
    };
    assert(argc == 2);
    for (size_t i = 0; i < sizeof cases / sizeof cases[0]; i++) {
        if (strcmp(argv[1], cases[i].name) == 0) {
            cases[i].check();
            return 0;
        }
    }
    return 1;
}
