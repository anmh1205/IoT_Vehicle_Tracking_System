#pragma once

/**
 * @file nvs_store_keys.h
 * @brief Internal NVS namespace and key constants shared by config stores.
 *
 * Defines the namespace and key names used for persistent storage of
 * tracker configuration and OTA context in ESP32 NVS flash.
 */

/** @brief NVS namespace for tracker configuration storage. */
#define TRACKER_NVS_NAMESPACE "tracker_cfg"

/** @brief Key for main tracker configuration binary blob. */
#define TRACKER_NVS_CONFIG_KEY "config"

/** @brief Key for OTA update context (version, partition, rollback state). */
#define TRACKER_NVS_OTA_CONTEXT_KEY "ota_ctx_v1"
