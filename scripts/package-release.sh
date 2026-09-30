#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-1.0.0.0}"
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DLL="${2:-$ROOT/bin/Release/net10.0/JellyfinExpiry.dll}"
DIST="$ROOT/dist"

[[ -f "$DLL" ]] || { echo "DLL not found: $DLL" >&2; exit 1; }
command -v zip >/dev/null 2>&1 || { echo "zip is required" >&2; exit 1; }

rm -rf "$DIST"
mkdir -p "$DIST/plugin" "$DIST/linux/scripts"

cp "$DLL" "$DIST/plugin/JellyfinExpiry.dll"
(
    cd "$DIST/plugin"
    zip -q "../JellyfinExpiry-plugin_${VERSION}.zip" JellyfinExpiry.dll
)

cp "$DLL" "$DIST/linux/JellyfinExpiry.dll"
cp "$ROOT/install.sh" "$ROOT/uninstall.sh" "$ROOT/README.md" "$ROOT/LICENSE" "$DIST/linux/"
cp "$ROOT/scripts/jellyfin-expiry-webhook" "$DIST/linux/scripts/"
chmod +x "$DIST/linux/install.sh" "$DIST/linux/uninstall.sh" "$DIST/linux/scripts/jellyfin-expiry-webhook"

(
    cd "$DIST/linux"
    tar -czf "../JellyfinExpiry-linux_${VERSION}.tar.gz" .
)

cd "$DIST"
sha256sum "JellyfinExpiry-plugin_${VERSION}.zip" "JellyfinExpiry-linux_${VERSION}.tar.gz" > SHA256SUMS
md5sum "JellyfinExpiry-plugin_${VERSION}.zip" > "JellyfinExpiry-plugin_${VERSION}.md5"

printf '\nCreated:\n'
ls -lh "JellyfinExpiry-plugin_${VERSION}.zip" "JellyfinExpiry-linux_${VERSION}.tar.gz" SHA256SUMS "JellyfinExpiry-plugin_${VERSION}.md5"
