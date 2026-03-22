#!/usr/bin/env bash

# ─── Check IDF Clang
# This script runs clang-tidy on the project using the ESP-IDF toolchain.
#
# See:
#   https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/tools/idf-clang-tidy.html
#
# Install:
#   idf_tools.py install esp-clang
#   source $IDF_PATH/export.sh

set -euo pipefail

# ─── Optional Verbose Mode ────────────────────────────────────────────────────────────────────────────────────────────
VERBOSE=false
if [[ "${1:-}" == "--verbose" || "${1:-}" == "-v" ]]; then
  VERBOSE=true
  shift
fi

error() {
  echo -e "\e[31mError: $*\e[0m" >&2
  exit 1
}

verbose() {
  if $VERBOSE; then
    echo -e "\e[90m$*\e[0m"
  fi
}

# ─── Required Variables and Tools ─────────────────────────────────────────────────────────────────────────────────────
[[ -n "${IDF_PATH:-}" ]] || error "IDF_PATH is not set"
[[ -n "${ESP_COMPILER_PATH:-}" ]] || error "ESP_COMPILER_PATH is not set"
command -v idf.py >/dev/null || error "idf.py not found in PATH"

# ─── Setup ────────────────────────────────────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLCHAIN_PATH="$(dirname "$(dirname "$ESP_COMPILER_PATH")")"
TOOLCHAIN_INCLUDE="$TOOLCHAIN_PATH/xtensa-esp-elf/include"
BUILD_DIR_CLANG=.build-clang
export IDF_TOOLCHAIN=clang

verbose "paths and variables:"
verbose "  idf.py:            $(command -v idf.py)"
verbose "  IDF_TOOLCHAIN:     $IDF_TOOLCHAIN"
verbose "  PROJECT_ROOT:      $PROJECT_ROOT"
verbose "  IDF_PATH:          $IDF_PATH"
verbose "  ESP_COMPILER_PATH: $ESP_COMPILER_PATH"
verbose "  TOOLCHAIN_INCLUDE: $TOOLCHAIN_INCLUDE"
verbose "  BUILD_DIR_CLANG:   $BUILD_DIR_CLANG"

# ─── Teardown ─────────────────────────────────────────────────────────────────────────────────────────────────────────

cleanup() {
  mv -f ./sdkconfig.bak ./sdkconfig
  verbose "Restored sdkconfig from sdkconfig.bak"
  rm -f warnings.txt
  verbose "Removed warnings.txt"
}

# ─── Backup ───────────────────────────────────────────────────────────────────────────────────────────────────────────
cp ./sdkconfig ./sdkconfig.bak
trap cleanup EXIT

# ─── Run clang-tidy via IDF ───────────────────────────────────────────────────────────────────────────────────────────
verbose "Running clang-tidy via IDF..."
# shellcheck disable=SC2046
idf.py --build-dir "$BUILD_DIR_CLANG" $($VERBOSE && echo --verbose) clang-check \
  --exclude-paths "$PROJECT_ROOT/managed_components" \
  --exit-code \
  --run-clang-tidy-options="\
    -header-filter=.* \
    -use-color=true \
    $($VERBOSE || echo -quiet) \
    -warnings-as-errors=clang-analyzer-* \
    -checks=-clang-analyzer-security.insecureAPI.DeprecatedOrUnsafeBufferHandling \
  "
