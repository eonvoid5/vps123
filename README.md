# VOID HOST — Panel Foundation

A Docker-free Minecraft hosting panel foundation inspired by the glassmorphic VOID HOST design direction supplied for this project.

## Current build

- Glassmorphic Minecraft hosting UI
- Exact green visual direction from the approved concept
- Login/register screens
- Overview dashboard
- Nodes / Servers / Deploy / Fleet / API Keys / Backups / Users / Settings navigation
- Server list
- Server console with live-style logs and command input
- Server start/restart/stop UI states
- CPU/RAM/Disk gauges and charts
- Responsive mobile navigation
- Reduced-motion support
- Express API foundation on port 6767
- `/api/health`, `/api/system`, `/api/servers`, `/api/config`

## Run

```bash
npm install
npm run dev
```

Production:

```bash
npm install
npm run build
PORT=6767 npm start
```

## Important

The first build deliberately keeps destructive host operations out of the browser. The next backend pass should add authenticated process management, per-server directories, Java process supervision, backups, SFTP and permissions with validation and audit logging.
