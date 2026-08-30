#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="/opt/void-host"
AGENT_PORT="${AGENT_PORT:-8080}"
SERVICE="void-host-agent"
ENV_FILE="$APP_DIR/.env"
LOG="/var/log/void-host-agent.log"

if [ "$(id -u)" -ne 0 ]; then echo "ERROR: run as root"; exit 1; fi
[ -d "$APP_DIR" ] || { echo "ERROR: $APP_DIR not found. Install VOID HOST panel first."; exit 1; }

apt-get update -y
apt-get install -y curl ca-certificates openssl

if ! command -v docker >/dev/null 2>&1; then
  apt-get install -y docker.io
fi
systemctl enable --now docker 2>/dev/null || true

grep -q '^AGENT_PORT=' "$ENV_FILE" 2>/dev/null || echo "AGENT_PORT=$AGENT_PORT" >> "$ENV_FILE"
if ! grep -q '^AGENT_TOKEN=' "$ENV_FILE" 2>/dev/null; then
  echo "AGENT_TOKEN=$(openssl rand -hex 32)" >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE"

cd "$APP_DIR"
npm install --no-audit --no-fund
npm run build:agent

cat > "/etc/systemd/system/$SERVICE.service" <<EOF
[Unit]
Description=VOID HOST Node Agent
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node $APP_DIR/dist/agent.cjs
Restart=always
RestartSec=3
User=root
LimitNOFILE=65535
StandardOutput=append:$LOG
StandardError=append:$LOG

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "$SERVICE"
sleep 2

TOKEN="$(grep '^AGENT_TOKEN=' "$ENV_FILE" | cut -d= -f2-)"
curl -fsS -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:$AGENT_PORT/api/agent/health" >/tmp/void-agent-health.json
cat /tmp/void-agent-health.json

echo
echo "VOID HOST NODE AGENT READY"
echo "Agent API: http://0.0.0.0:$AGENT_PORT"
echo "Game allocations: 25565+"
echo "SFTP compatibility target: 2022"
echo "Service: $SERVICE"
