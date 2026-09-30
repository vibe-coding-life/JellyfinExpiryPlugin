#!/usr/bin/env bash
set -euo pipefail

PLUGIN_NAME="JellyfinExpiry"
PLUGIN_VERSION="1.0.0.0"
JELLYFIN_SERVICE="${JELLYFIN_SERVICE:-jellyfin}"
JELLYFIN_WEB_DIR="${JELLYFIN_WEB_DIR:-/usr/share/jellyfin/web}"
JELLYFIN_PLUGIN_DIR="${JELLYFIN_PLUGIN_DIR:-/var/lib/jellyfin/plugins}"
INSTALL_DIR="$JELLYFIN_PLUGIN_DIR/${PLUGIN_NAME}_${PLUGIN_VERSION}"
DROPIN_FILE="/etc/systemd/system/${JELLYFIN_SERVICE}.service.d/jellyfin-expiry-webhook.conf"
WEBHOOK_TARGET="/usr/local/sbin/jellyfin-expiry-webhook"
ENV_FILE="/etc/default/jellyfin-expiry"
PURGE=0

if [[ "${1:-}" == "--purge-data" ]]; then
    PURGE=1
elif [[ $# -gt 0 ]]; then
    echo "Usage: sudo ./uninstall.sh [--purge-data]" >&2
    exit 2
fi

[[ ${EUID:-$(id -u)} -eq 0 ]] || { echo "ERROR: run this uninstaller as root" >&2; exit 1; }

# Stop the pre-start hook being reapplied before surgically removing it.
rm -f "$DROPIN_FILE"
systemctl daemon-reload

python3 - "$JELLYFIN_WEB_DIR" <<'PY'
from pathlib import Path
import json
import sys

web = Path(sys.argv[1])
index = web / "index.html"
config = web / "config.json"
loader = '<script src="../JellyfinExpiry/WebPlugin.js"></script>'
plugin = "JellyfinExpiryWebPlugin"

if index.is_file():
    html = index.read_text(encoding="utf-8")
    changed = False
    for candidate in (
        f"    {loader}\n",
        f"{loader}\n",
        loader,
    ):
        if candidate in html:
            html = html.replace(candidate, "")
            changed = True
    if changed:
        index.write_text(html, encoding="utf-8")
        print("Removed Jellyfin Expiry loader from index.html")

if config.is_file():
    try:
        data = json.loads(config.read_text(encoding="utf-8"))
        plugins = data.get("plugins")
        if isinstance(plugins, list) and plugin in plugins:
            data["plugins"] = [x for x in plugins if x != plugin]
            config.write_text(json.dumps(data, indent=4) + "\n", encoding="utf-8")
            print("Removed Jellyfin Expiry entry from config.json")
    except Exception as exc:
        print(f"WARNING: could not update {config}: {exc}", file=sys.stderr)
PY

rm -rf "$INSTALL_DIR"
rm -f "$WEBHOOK_TARGET" "$ENV_FILE"

if [[ $PURGE -eq 1 ]]; then
    rm -rf /var/lib/jellyfin/data/JellyfinExpiry
    echo "Removed Jellyfin Expiry database data."
else
    echo "Expiry database preserved at /var/lib/jellyfin/data/JellyfinExpiry"
fi

systemctl restart "$JELLYFIN_SERVICE"

echo "Jellyfin Expiry uninstalled."
