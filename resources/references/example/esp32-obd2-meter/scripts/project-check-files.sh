#!/usr/bin/env sh

PROJECT_DIR="$(dirname "$0")/.."

project_c_files() {
  # Find all C source and header files in the project, excluding build directories and external components
  find "$PROJECT_DIR" \
    -path "$PROJECT_DIR/main/fonts" -prune -o \
    -path "$PROJECT_DIR/build" -prune -o \
    -path "$PROJECT_DIR/.build-*" -prune -o \
    -path "$PROJECT_DIR/external" -prune -o \
    -path "$PROJECT_DIR/managed_components" -prune -o \
    -type f \( -name "*.c" -o -name "*.h" \) -print | while read -r f; do realpath --relative-to="$PWD" "$f"; done
}

project_source_files() {
  # Find all C source files in the project, excluding build directories and external components
  find "$PROJECT_DIR" \
    -path "$PROJECT_DIR/main/fonts" -prune -o \
    -path "$PROJECT_DIR/build" -prune -o \
    -path "$PROJECT_DIR/.build-*" -prune -o \
    -path "$PROJECT_DIR/external" -prune -o \
    -path "$PROJECT_DIR/managed_components" -prune -o \
    -type f -name "*.c" -print | while read -r f; do realpath --relative-to="$PWD" "$f"; done
}

project_script_files() {
  find "$PROJECT_DIR" \
    -path "$PROJECT_DIR/build" -prune -o \
    -path "$PROJECT_DIR/.build-*" -prune -o \
    -path "$PROJECT_DIR/external" -prune -o \
    -path "$PROJECT_DIR/managed_components" -prune -o \
    -type f -name "*.sh" -print | while read -r f; do realpath --relative-to="$PWD" "$f"; done
}
