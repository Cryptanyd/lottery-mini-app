#!/usr/bin/env bash
# Builds a zip ready for upload to the Chrome Web Store / Edge Add-ons.
#
# Usage:
#   ./scripts/pack.sh                          # uses SCANX_BASE_URL from src/shared/config.js
#   ./scripts/pack.sh https://your-domain.com  # bakes your domain into the zip (source files untouched)
set -euo pipefail
cd "$(dirname "$0")/.."

DOMAIN="${1:-}"
VERSION=$(grep '"version"' manifest.json | head -1 | sed -E 's/.*"([0-9.]+)".*/\1/')

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
cp -R manifest.json src icons "$STAGE"/
rm -f "$STAGE/icons/icon.svg"

if [[ -n "$DOMAIN" ]]; then
  DOMAIN="${DOMAIN%/}"
  if [[ ! "$DOMAIN" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
    echo "Domain must look like https://example.com (https, no path)" >&2
    exit 1
  fi
  sed -i.bak -E "s#^const SCANX_BASE_URL = \".*\";#const SCANX_BASE_URL = \"${DOMAIN}\";#" "$STAGE/src/shared/config.js"
  rm -f "$STAGE/src/shared/config.js.bak"
fi

BAKED=$(grep -E '^const SCANX_BASE_URL' "$STAGE/src/shared/config.js" | sed -E 's/.*"(.*)".*/\1/')
if [[ "$BAKED" == "https://scanx.app" ]]; then
  echo "⚠  Domain is still the placeholder https://scanx.app — pass your domain: ./scripts/pack.sh https://your-domain.com" >&2
fi

mkdir -p dist
OUT="$PWD/dist/scanx-extension-v${VERSION}.zip"
rm -f "$OUT"
(cd "$STAGE" && zip -r -q -X "$OUT" manifest.json src icons)
echo "Created dist/scanx-extension-v${VERSION}.zip  (site: ${BAKED})"
