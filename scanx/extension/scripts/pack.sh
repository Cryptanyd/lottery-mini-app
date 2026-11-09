#!/usr/bin/env bash
# Builds a zip ready for upload to the Chrome Web Store / Edge Add-ons.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(grep '"version"' manifest.json | head -1 | sed -E 's/.*"([0-9.]+)".*/\1/')
mkdir -p dist
OUT="dist/scanx-extension-v${VERSION}.zip"
zip -r -q "$OUT" manifest.json src icons -x "icons/icon.svg"
echo "Created $OUT"
