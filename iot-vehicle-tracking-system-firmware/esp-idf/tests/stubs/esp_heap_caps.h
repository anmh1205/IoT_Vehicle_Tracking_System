#pragma once
#include <stddef.h>

#define MALLOC_CAP_8BIT (1u << 2)

static inline size_t heap_caps_get_free_size(unsigned caps) { (void)caps; return 128u * 1024u; }
static inline size_t heap_caps_get_minimum_free_size(unsigned caps) { (void)caps; return 96u * 1024u; }
static inline size_t heap_caps_get_largest_free_block(unsigned caps) { (void)caps; return 64u * 1024u; }
