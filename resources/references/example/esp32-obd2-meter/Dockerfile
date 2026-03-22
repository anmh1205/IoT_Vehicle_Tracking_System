FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV ESP_IDF_VERSION=v5.4.1
ENV ESP_IDF_SDK=/opt/esp-idf

RUN apt-get update \
    && apt-get install -y \
        git \
        wget \
        python3 \
        python3-pip \
        python3-venv \
        cmake \
        ninja-build \
        ccache \
        flex \
        bison \
        gperf \
        libffi-dev \
        libssl-dev \
        dfu-util \
        libusb-1.0-0 \
        clang-18 \
        libclang-18-dev \
        llvm-18-dev \
        shellcheck \
        jq \
        npm \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install ESP-IDF as root
RUN git clone -b ${ESP_IDF_VERSION} --recursive https://github.com/espressif/esp-idf.git ${ESP_IDF_SDK} \
    && cd ${ESP_IDF_SDK} \
    && git clean -fdx \
    && git gc --prune=all \
    && rm -rf .git

# Install IWYU (include-what-you-use) (as root)
RUN git clone --branch clang_18 https://github.com/include-what-you-use/include-what-you-use.git \
    && cd include-what-you-use \
    && cmake -Bbuild -S. \
        -DCMAKE_C_COMPILER=clang-18 \
        -DCMAKE_CXX_COMPILER=clang++-18 \
        -DCMAKE_PREFIX_PATH=/usr/lib/llvm-18 \
    && cmake --build build \
    && cmake --install build \
    && cd .. \
    && rm -rf include-what-you-use

# Install font converter (lv_font_conv) (as root)
RUN npm i -g lv_font_conv

# Switch to non-root user (ubuntu, uid/gid: 1000:1000)
USER ubuntu
WORKDIR /workspace

# Install ESP-IDF (as non-root user)
RUN cd ${ESP_IDF_SDK} && ./install.sh
RUN python3 ${ESP_IDF_SDK}/tools/idf_tools.py install esp-clang
RUN git config --global --add safe.directory ${ESP_IDF_SDK}

# Default command
CMD ["/bin/bash"]
