#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/void-host"
PORT="${PORT:-6767}"
REPO="https://github.com/eonvoid5/vps123.git"
LOG="/var/log/void-host-panel.log"

echo "========================================"
echo "        VOID HOST INSTALLER"
echo "========================================"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: Run as root."
  exit 1
fi

echo "[1/8] Installing required packages..."

apt-get update -y
apt-get install -y git curl ca-certificates

echo "[2/8] Checking Node.js..."

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"

echo "[3/8] Downloading VOID HOST..."

rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"

git clone --depth 1 "$REPO" /tmp/void-host-repo

if [ -d /tmp/void-host-repo/vps ]; then
  cp -a /tmp/void-host-repo/vps/. "$APP_DIR/"
else
  cp -a /tmp/void-host-repo/. "$APP_DIR/"
fi

rm -rf /tmp/void-host-repo

cd "$APP_DIR"

echo "[4/8] Configuring Vite allowed host..."

if [ -f vite.config.ts ]; then
  python3 - <<'PY'
from pathlib import Path

p = Path("vite.config.ts")
s = p.read_text()

host = "panel.voidhost.indevs.in"

if "allowedHosts" not in s:
    s = s.replace(
        "server: {",
        "server: {\n      allowedHosts: ['" + host + "'],",
        1
    )
else:
    print("allowedHosts already exists")

p.write_text(s)
PY
fi

echo "[5/8] Installing dependencies..."

npm install --no-audit --no-fund

echo "[6/8] Building production panel..."

npm run build

echo "[7/8] Starting VOID HOST on port $PORT..."

mkdir -p "$(dirname "$LOG")"

pkill -f "$APP_DIR/dist/server" 2>/dev/null || true
pkill -f "node.*dist/server" 2>/dev/null || true

if [ -f dist/server.cjs ]; then
    ENTRY="dist/server.cjs"
elif [ -f dist/server.mjs ]; then
    ENTRY="dist/server.mjs"
else
    echo "ERROR: Production server file was not created."
    echo
    echo "dist contents:"
    find dist -maxdepth 2 -type f -print
    exit 1
fi

nohup env PORT="$PORT" node "$ENTRY" >> "$LOG" 2>&1 </dev/null &

sleep 4

echo "[8/8] Testing panel..."

if curl -fsS "http://127.0.0.1:$PORT/" >/dev/null; then
    echo
    echo "========================================"
    echo "       INSTALLATION SUCCESSFUL"
    echo "========================================"
    echo
    echo "Panel port : $PORT"
    echo "Panel path : $APP_DIR"
    echo "Log file   : $LOG"
    echo
    echo "Local test:"
    echo "http://127.0.0.1:$PORT"
    echo
    echo "Cloudflare origin:"
    echo "http://127.0.0.1:$PORT"
    echo
else
    echo
    echo "ERROR: Panel failed to respond."
    echo
    echo "========== LOG =========="
    tail -100 "$LOG" 2>/dev/null || true
    exit 1
fi
