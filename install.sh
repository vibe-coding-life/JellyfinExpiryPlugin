#!/usr/bin/env bash
set -euo pipefail

PLUGIN_NAME="JellyfinExpiry"
PLUGIN_VERSION="1.0.0.0"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DLL_SOURCE="$SCRIPT_DIR/JellyfinExpiry.dll"
WEBHOOK_SOURCE="$SCRIPT_DIR/scripts/jellyfin-expiry-webhook"

JELLYFIN_SERVICE="${JELLYFIN_SERVICE:-jellyfin}"
JELLYFIN_WEB_DIR="${JELLYFIN_WEB_DIR:-/usr/share/jellyfin/web}"
JELLYFIN_PLUGIN_DIR="${JELLYFIN_PLUGIN_DIR:-/var/lib/jellyfin/plugins}"
BACKUP_DIR="${JELLYFIN_EXPIRY_BACKUP_DIR:-/var/backups/jellyfin-expiry}"
READY_TIMEOUT="${JELLYFIN_EXPIRY_READY_TIMEOUT:-60}"
INSTALL_DIR="$JELLYFIN_PLUGIN_DIR/${PLUGIN_NAME}_${PLUGIN_VERSION}"
ENV_FILE="/etc/default/jellyfin-expiry"
DROPIN_DIR="/etc/systemd/system/${JELLYFIN_SERVICE}.service.d"
DROPIN_FILE="$DROPIN_DIR/jellyfin-expiry-webhook.conf"
WEBHOOK_TARGET="/usr/local/sbin/jellyfin-expiry-webhook"

fail() {
    echo "ERROR: $*" >&2
    exit 1
}

[[ ${EUID:-$(id -u)} -eq 0 ]] || fail "run this installer as root"
command -v systemctl >/dev/null 2>&1 || fail "systemd is required by the v1.0.0 Linux installer"
command -v journalctl >/dev/null 2>&1 || fail "journalctl is required by the v1.0.0 Linux installer"
command -v python3 >/dev/null 2>&1 || fail "python3 is required"
[[ "$READY_TIMEOUT" =~ ^[0-9]+$ ]] && (( READY_TIMEOUT >= 5 )) || fail "JELLYFIN_EXPIRY_READY_TIMEOUT must be an integer of at least 5 seconds"
[[ -f "$DLL_SOURCE" ]] || fail "JellyfinExpiry.dll must be beside install.sh"
[[ -f "$WEBHOOK_SOURCE" ]] || fail "scripts/jellyfin-expiry-webhook is missing"
[[ -f "$JELLYFIN_WEB_DIR/index.html" ]] || fail "Jellyfin Web index.html not found at $JELLYFIN_WEB_DIR"
[[ -f "$JELLYFIN_WEB_DIR/config.json" ]] || fail "Jellyfin Web config.json not found at $JELLYFIN_WEB_DIR"

# The frontend integration relies on these Jellyfin Web extension points.
# Refuse obviously incompatible layouts unless the operator explicitly forces it.
if ! grep -q 'main.jellyfin.bundle.js' "$JELLYFIN_WEB_DIR/index.html" || \
   ! grep -Rqs 'actionSheetMenuItem' "$JELLYFIN_WEB_DIR" --include='*.js'; then
    if [[ "${JELLYFIN_EXPIRY_FORCE:-0}" != "1" ]]; then
        fail "this Jellyfin Web layout has not passed the v1.0.0 compatibility checks. Set JELLYFIN_EXPIRY_FORCE=1 only if you have tested it."
    fi
    echo "WARNING: forcing installation on an unverified Jellyfin Web layout."
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
cp -a "$JELLYFIN_WEB_DIR/index.html" "$BACKUP_DIR/index.html.$STAMP.preinstall"
cp -a "$JELLYFIN_WEB_DIR/config.json" "$BACKUP_DIR/config.json.$STAMP.preinstall"

if [[ -e "$INSTALL_DIR/JellyfinExpiry.dll" ]]; then
    cp -a "$INSTALL_DIR/JellyfinExpiry.dll" "$BACKUP_DIR/JellyfinExpiry.dll.$STAMP.preinstall"
fi

JF_USER="$(systemctl show "$JELLYFIN_SERVICE" -p User --value 2>/dev/null || true)"
[[ -n "$JF_USER" ]] || JF_USER="jellyfin"
id "$JF_USER" >/dev/null 2>&1 || fail "Jellyfin service user '$JF_USER' does not exist"
JF_GROUP="$(id -gn "$JF_USER")"

install -d -m 0755 -o "$JF_USER" -g "$JF_GROUP" "$INSTALL_DIR"
install -m 0644 -o "$JF_USER" -g "$JF_GROUP" "$DLL_SOURCE" "$INSTALL_DIR/JellyfinExpiry.dll"
install -m 0755 "$WEBHOOK_SOURCE" "$WEBHOOK_TARGET"

cat > "$ENV_FILE" <<EOF
JELLYFIN_WEB_DIR=$JELLYFIN_WEB_DIR
JELLYFIN_EXPIRY_BACKUP_DIR=$BACKUP_DIR
EOF
chmod 0644 "$ENV_FILE"

mkdir -p "$DROPIN_DIR"
cat > "$DROPIN_FILE" <<'EOF'
[Service]
EnvironmentFile=-/etc/default/jellyfin-expiry
ExecStartPre=/usr/local/sbin/jellyfin-expiry-webhook
EOF
chmod 0644 "$DROPIN_FILE"

JELLYFIN_WEB_DIR="$JELLYFIN_WEB_DIR" \
JELLYFIN_EXPIRY_BACKUP_DIR="$BACKUP_DIR" \
    "$WEBHOOK_TARGET"

systemctl daemon-reload

START_EPOCH="$(date +%s)"
systemctl restart "$JELLYFIN_SERVICE"

echo "Waiting for Jellyfin to complete startup..."

READY=0
for ((SECOND=0; SECOND<READY_TIMEOUT; SECOND++)); do
    if systemctl is-failed --quiet "$JELLYFIN_SERVICE"; then
        echo "Jellyfin entered a failed state after installation." >&2
        systemctl status "$JELLYFIN_SERVICE" --no-pager -l >&2 || true
        journalctl -u "$JELLYFIN_SERVICE" --since "@$START_EPOCH" --no-pager -n 100 >&2 || true
        exit 1
    fi

    CURRENT_LOG="$(journalctl -u "$JELLYFIN_SERVICE" --since "@$START_EPOCH" --no-pager -o cat 2>/dev/null || true)"

    if grep -q 'Startup complete' <<<"$CURRENT_LOG"; then
        READY=1
        break
    fi

    sleep 1
done

if (( READY != 1 )); then
    echo "Jellyfin did not report startup completion within ${READY_TIMEOUT}s." >&2
    systemctl status "$JELLYFIN_SERVICE" --no-pager -l >&2 || true
    journalctl -u "$JELLYFIN_SERVICE" --since "@$START_EPOCH" --no-pager -n 100 >&2 || true
    exit 1
fi

if ! systemctl is-active --quiet "$JELLYFIN_SERVICE"; then
    echo "Jellyfin is not active after startup." >&2
    systemctl status "$JELLYFIN_SERVICE" --no-pager -l >&2 || true
    exit 1
fi

STARTUP_LOG="$(journalctl -u "$JELLYFIN_SERVICE" --since "@$START_EPOCH" --no-pager -o cat 2>/dev/null || true)"

if ! grep -q 'Loaded plugin: Jellyfin Expiry' <<<"$STARTUP_LOG"; then
    echo "Jellyfin started, but Jellyfin Expiry was not found in the startup log." >&2
    echo "$STARTUP_LOG" >&2
    exit 1
fi

echo
echo "Jellyfin Expiry $PLUGIN_VERSION installed successfully."
echo "Plugin: $INSTALL_DIR/JellyfinExpiry.dll"
echo "Web backups: $BACKUP_DIR"
echo
echo "Open Jellyfin Dashboard -> Plugins -> Jellyfin Expiry."
echo "Keep Dry Run enabled until you have verified your configuration."
