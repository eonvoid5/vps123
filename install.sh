#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="/opt/void-host"; PORT="${PORT:-6969}"; REPO="https://github.com/eonvoid5/vps123.git"; LOG="/var/log/void-host-panel.log"; SERVICE="void-host-panel"
if [ "$(id -u)" -ne 0 ]; then echo "ERROR: Run as root."; exit 1; fi
echo "[1/8] Installing OS packages..."; apt-get update -y; apt-get install -y git curl ca-certificates openssl openjdk-21-jre
command -v java >/dev/null || { echo "Java installation failed"; exit 1; }; java -version
echo "[2/8] Installing Node.js 22 if needed..."; if ! command -v node >/dev/null 2>&1; then curl -fsSL https://deb.nodesource.com/setup_22.x | bash -; apt-get install -y nodejs; fi
node -v; npm -v
echo "[3/8] Downloading VOID HOST..."; rm -rf "$APP_DIR" /tmp/void-host-repo; git clone --depth 1 "$REPO" /tmp/void-host-repo; mkdir -p "$APP_DIR"; cp -a /tmp/void-host-repo/. "$APP_DIR/"; rm -rf /tmp/void-host-repo; cd "$APP_DIR"
echo "[4/8] Installing dependencies..."; npm install --no-audit --no-fund
echo "[5/8] Building production panel..."; npm run build
if [ ! -f dist/server.cjs ]; then echo "ERROR: dist/server.cjs was not created"; find dist -maxdepth 2 -type f -print; exit 1; fi
echo "[6/8] Creating persistent data directories..."; mkdir -p "$APP_DIR/data/servers" "$APP_DIR/data/backups"; touch "$LOG"; chmod 755 "$APP_DIR"
SECRET_FILE="$APP_DIR/.env"; if [ ! -f "$SECRET_FILE" ]; then printf 'JWT_SECRET=%s\nPORT=%s\n' "$(openssl rand -hex 32)" "$PORT" > "$SECRET_FILE"; chmod 600 "$SECRET_FILE"; else sed -i "s/^PORT=.*/PORT=$PORT/" "$SECRET_FILE"; fi
echo "[7/8] Installing systemd service..."; cat > "/etc/systemd/system/$SERVICE.service" <<EOF
[Unit]
Description=VOID HOST Minecraft Hosting Panel
After=network.target
[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$SECRET_FILE
ExecStart=/usr/bin/node $APP_DIR/dist/server.cjs
Restart=always
RestartSec=3
User=root
LimitNOFILE=65535
StandardOutput=append:$LOG
StandardError=append:$LOG
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload; systemctl enable --now "$SERVICE"; sleep 3
echo "[8/8] Testing..."; curl -fsS "http://127.0.0.1:$PORT/api/health"; echo; echo "========================================"; echo "VOID HOST INSTALLED"; echo "Port: $PORT"; echo "Service: $SERVICE"; echo "Log: $LOG"; echo "========================================"
