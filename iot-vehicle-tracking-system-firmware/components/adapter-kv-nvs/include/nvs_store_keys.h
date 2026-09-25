#pragma once

/**
 * @file nvs_store_keys.h
 * @brief Internal NVS namespace and key constants shared by config stores.
 *
 * Defines the namespace and key names used for persistent storage of
 * tracker configuration and OTA context in ESP32 NVS flash.
 * This header belongs to the KV/NVS persistence adapter layer and exposes the persistence boundary so higher layers do not depend on raw NVS keys or blob layouts.
 */

// Public declarations stay grouped here so other components consume the
// module contract without reaching into private implementation details.


/** @brief NVS namespace for tracker configuration storage. */
#define TRACKER_NVS_NAMESPACE "tracker_cfg"

/** @brief Key for main tracker configuration binary blob. */
#define TRACKER_NVS_CONFIG_KEY "config"

/** @brief Key for OTA update context (version, partition, rollback state). */
#define TRACKER_NVS_OTA_CONTEXT_KEY "ota_ctx_v1"

/** @brief Key for active session recovery context. */
#define TRACKER_NVS_SESSION_CONTEXT_KEY "session_ctx_v1"

/** @brief Key for persistent recent cloud-command IDs. */
#define TRACKER_NVS_COMMAND_DEDUPE_KEY "cmd_dedupe_v1"
