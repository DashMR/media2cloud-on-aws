#!/bin/bash

#
# Build the canvas Lambda layer in the Lambda Node.js 24 container so native
# modules and shared libraries match the deployed runtime.
#

#
set -euo pipefail

#
# Node configuration
# (Default to build nodejs24.x package)
#
VER_NODE=24.13.0
VER_NODE_MODULE=137

#
# Canvas configuration
#
VER_CANVAS=2.11.2
OUTPUT_ZIP=${1:-canvas-v${VER_CANVAS}-node-${VER_NODE}-v${VER_NODE_MODULE}-amzn2023-glibc-x64.zip}

#
# AWS Lambda Layer configuration
#
IMAGE=public.ecr.aws/lambda/nodejs:${VER_NODE%%.*}

mkdir -p "$(dirname "${OUTPUT_ZIP}")"
rm -f "${OUTPUT_ZIP}"

docker run --rm \
  --entrypoint /bin/bash \
  -v "${PWD}:/asset" \
  -w /asset \
  -e VER_CANVAS="${VER_CANVAS}" \
  -e OUTPUT_ZIP="${OUTPUT_ZIP}" \
  -e HOST_UID="$(id -u)" \
  -e HOST_GID="$(id -g)" \
  "${IMAGE}" \
  -lc '
    set -euo pipefail
    dnf install -y gcc-c++ make python3 cairo-devel libjpeg-turbo-devel giflib-devel pango-devel patchelf zip
    rm -rf nodejs
    mkdir -p nodejs
    npm_config_build_from_source=true npm install --prefix nodejs canvas@${VER_CANVAS}

    # node-gyp also leaves a duplicate canvas.node under build/Release/obj.target/,
    # which "find -print -quit" can match instead of the one bindings.js actually
    # loads (../build/Release/canvas.node). Pin to the real load path explicitly.
    release_dir=nodejs/node_modules/canvas/build/Release
    test -f "${release_dir}/canvas.node"
    ldd "${release_dir}/canvas.node" \
      | awk "/=> \/.*\.so/ { print \$3 } /^\/.*\.so/ { print \$1 }" \
      | while read -r lib; do cp -Lv "${lib}" "${release_dir}/"; done
    find "${release_dir}" -maxdepth 1 \( -name "*.node" -o -name "*.so*" \) \
      -exec patchelf --set-rpath "\$ORIGIN" {} \;

    # Verify every dependency now resolves before packaging the layer.
    if ldd "${release_dir}/canvas.node" | grep -q "not found"; then
      echo "ERROR: unresolved shared library dependencies in canvas.node:" >&2
      ldd "${release_dir}/canvas.node" | grep "not found" >&2
      exit 1
    fi

    zip -rq "${OUTPUT_ZIP}" nodejs
    chown "${HOST_UID}:${HOST_GID}" "${OUTPUT_ZIP}"
    rm -rf nodejs
  '
