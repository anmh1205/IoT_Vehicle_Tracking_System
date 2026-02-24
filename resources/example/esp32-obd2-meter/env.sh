# shellcheck shell=bash

if [ -z "$ESP_IDF_SDK" ]; then
    echo -e "\033[0;31mError: ESP_IDF_SDK environment variable is not set.\033[0m"
    return 1
fi

if [ ! -d "$ESP_IDF_SDK" ]; then
    echo -e "\033[0;31mError: ESP_IDF_SDK does not point to a valid directory: $ESP_IDF_SDK\033[0m"
    return 1
fi

echo -e "\033[38;5;208m*\033[0m Found \033[0;35mESP_IDF_SDK\033[0m: \033[1;32m$ESP_IDF_SDK\033[0m'"

# shellcheck disable=SC1091
source "$ESP_IDF_SDK/export.sh"
alias idf=idf.py
alias check=./check.sh

ESP_COMPILER_PATH=$(which xtensa-esp32-elf-gcc)
if [ -z "$ESP_COMPILER_PATH" ]; then
    echo -e "\033[0;31mError: xtensa-esp32-elf-gcc not found in PATH.\033[0m"
    return 1
fi
export ESP_COMPILER_PATH

ESP_CLANG_DIR=$(dirname "$(dirname "$(command -v clang)")")
export ESP_CLANG_DIR

echo
echo -e "\033[38;5;208m*\033[0m \033[0;35midf.py\033[0m version:              \033[1;32m$(idf.py --version)\033[0m"
echo -e "\033[38;5;208m*\033[0m \033[0;35midf.py\033[0m is aliased to:        \033[1;32midf\033[0m"
echo -e "\033[38;5;208m*\033[0m \033[0;35m./check.sh\033[0m is aliased to:    \033[1;32mcheck\033[0m"
echo -e "\033[38;5;208m*\033[0m \033[0;35mESP_COMPILER_PATH\033[0m exported:  \033[1;32m$ESP_COMPILER_PATH\033[0m"
echo -e "\033[38;5;208m*\033[0m \033[0;35mESP_CLANG_DIR\033[0m exported:      \033[1;32m$ESP_CLANG_DIR\033[0m"
