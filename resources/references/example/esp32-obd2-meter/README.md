# OBD2/BLE Meter on Waveshare ESP32-S3 round 1.28" LCD

This project provides firmware for an in-car device that connects to an OBD2 Bluetooth Low Energy (BLE) adapter and displays real-time vehicle data such as speed, RPM, engine load, and more.

The project has been tested with the _Vgate iCar Pro Bluetooth 4.0 (BLE)_ OBD2 adapter, but should also work with any BLE adapter based on the ELM327 chipset.

## Features

- [Waveshare ESP32-S3-Touch-LCD-1.28](https://www.waveshare.com/wiki/ESP32-S3-Touch-LCD-1.28) ([shop](https://www.waveshare.com/1.28inch-touch-lcd.htm?utm_source=chatgpt.com))
- [LVGL](https://lvgl.io/) ([doc](https://docs.lvgl.io/master/details/integration/chip/espressif.html))
- [NimBLE](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/bluetooth/nimble/index.html)

## IDF SDK installation

```sh
sudo apt install python3-venv

git clone -b v5.4.1 --recursive-submodules https://github.com/espressif/esp-idf.git
./esp-idf/install.sh
```

For this project, export `ESP_IDF_SDK`. This allows `env.sh` to source the SDK's usual `export.sh`, alias `idf.py` to `idf` and setup `ESP_COMPILER_PATH` for use in VSCode:

```sh
export ESP_IDF_SDK=<SDK path from above git clone>
```

### Development

```sh
source ./env.sh

idf build
```

#### Common development commands

```sh
idf menuconfig

# rull clean
idf fullclean
idf reconfigure
idf build

# _really_ full clean
rm -rf build managed_components dependencies.lock && idf fullclean reconfigure
idf build

# usual build & flash & monitor
idf build
idf flash -p /dev/ttyACM0
idf monitor -p /dev/ttyACM0
# `ctrl+]` to quit monitor

idf build flash -p /dev/ttyACM0 monitor
```

#### Code Quality

Dependencies:

```sh
sudo apt install shellcheck jq
idf_tools.py install esp-clang
source env.sh
```

```sh
# check
./check.sh
./check.sh all
./check.sh -h

# fix formatting
./check.sh format
```

##### IWYU

Install `include-what-you-use`:

```sh
sudo apt install git cmake clang-18 libclang-18-dev llvm-18-dev

git clone --branch clang_18 https://github.com/include-what-you-use/include-what-you-use.git
cd include-what-you-use

cmake -Bbuild -S. \
  -DCMAKE_C_COMPILER=clang-18 \
  -DCMAKE_CXX_COMPILER=clang++-18 \
  -DCMAKE_PREFIX_PATH=/usr/lib/llvm-18

cmake --build build
sudo cmake --install build
which include-what-you-use
```

Usage:

```sh
./scripts/check-iwyu.sh [<files>]
./scripts/check-iwyu.sh -o iwyu
```

### Simulator

```sh
sudo apt install python3-dbus

virtualenv --system-site-packages .venv
source .venv/bin/activate
pip install sim/requirements.txt

python3 sim/adv_gatt.py
```

### Docker

```sh
docker-compose build
docker-compose run build
docker-compose run check
```

Push to gitlab registry:

```sh
docker login registry.gitlab.com
docker-compose push
```
