#include <assert.h>
#include <string.h>
#include "ivts_core/payload/json_fields.h"

int main(void)
{
    const char json[] = "{\"name\":\"a\\u0062\",\"bool\":false,\"id\":18446744073709551616,"
                        "\"max\":\"18446744073709551615\",\"negative\":-1,\"zero\":0,\"str_id\":\"007\"}";
    ivts_jtok_t tokens[20];
    int count = ivts_json_parse(json, sizeof json - 1u, tokens, 20, 4);
    assert(count > 0);
    const ivts_json_obj_t object = { json, tokens, count, 0 };
    char output[24];
    uint64_t value = 0;
    bool enabled = true;

    assert(ivts_json_obj_get_str(&object, "name", output, sizeof output));
    assert(strcmp(output, "ab") == 0);
    assert(ivts_json_obj_get_bool(&object, "bool", &enabled) && !enabled);
    assert(!ivts_json_obj_get_bool(&object, "zero", &enabled));
    assert(ivts_json_obj_has(&object, "id") && !ivts_json_obj_has(&object, "missing"));
    assert(ivts_json_obj_get_u64(&object, "max", UINT64_MAX, &value) && value == UINT64_MAX);
    assert(!ivts_json_obj_get_u64(&object, "id", UINT64_MAX, &value));
    assert(!ivts_json_obj_get_u64(&object, "negative", UINT64_MAX, &value));
    assert(ivts_json_obj_read_id(&object, "id", output, sizeof output));
    assert(strcmp(output, "18446744073709551616") == 0);
    assert(ivts_json_obj_read_id(&object, "zero", output, sizeof output) && output[0] == '\0');
    assert(ivts_json_obj_read_id(&object, "str_id", output, sizeof output));
    assert(strcmp(output, "007") == 0);
    assert(ivts_json_obj_read_id(&object, "id", output, 10) && output[0] == '\0');
    assert(!ivts_json_obj_read_id(&object, "missing", output, sizeof output));
}
