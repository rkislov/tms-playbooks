#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TARGET_OS=${GOOS:-linux}
TARGET_ARCH=${GOARCH:-arm64}
case "$TARGET_OS-$TARGET_ARCH" in linux-arm64|linux-amd64|darwin-arm64|darwin-amd64) ;; *) echo 'Unsupported target' >&2; exit 1 ;; esac
(cd build/manifest && go build -o ../bin/manifest .)
build/bin/manifest apply
CGO_ENABLED=0 GOOS="$TARGET_OS" GOARCH="$TARGET_ARCH" go build -trimpath -o "server/dist/plugin-$TARGET_OS-$TARGET_ARCH" ./server
(cd webapp && npm ci --no-audit --no-fund && npm run check-types && npm run build && ./node_modules/.bin/webpack --config webpack.tms-host.js --mode production)
python3 scripts/package-tms.py "$TARGET_OS-$TARGET_ARCH"
