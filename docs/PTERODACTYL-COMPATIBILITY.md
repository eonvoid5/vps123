# VOID HOST ↔ Pterodactyl architecture map

VOID HOST is not a fork of Pterodactyl. This document maps the architecture we are implementing to the current Pterodactyl terminology so the UI and node model stay compatible.

## Core topology

```text
Browser
  │ HTTPS
  ▼
VOID HOST Panel :6969
  │ authenticated control API
  ▼
VOID HOST Node Agent :8080
  │ local process/container control
  ├── Minecraft allocations :25565+
  └── future SFTP service :2022
```

Pterodactyl uses the same separation of concerns: Panel is the web/control layer and Wings is the node control-plane daemon. Wings exposes an API on port 8080 by default (8443 with TLS), while SFTP uses port 2022. A node is registered in the Panel and its configuration is copied to the node. Allocations are IP+port pairs assigned to servers. See the official Wings installation and configuration documentation.

## Server-level feature map

VOID HOST's target server workspace includes:

- Console and power controls
- File manager and file content editing
- Backups with create/delete/restore-ready API surface
- Schedules with cron and task actions
- Databases
- Users/Subusers and permissions
- Startup/environment configuration
- Network/allocations
- Server settings and reinstall hooks
- Plugin, mod and modpack managers
- MOTD tooling

Pterodactyl's current Client API exposes the equivalent areas for command/power, databases, files, schedules, users, backups, startup and settings. Allocation permissions are separate and can be restricted independently.

## Admin-level feature map

The admin/control-plane target is:

- Nodes
- Allocations
- Servers
- Users
- Locations
- Nests and Eggs
- Node health/metrics
- Server ownership and resource limits

## Important distinction

The current VOID HOST runtime still uses the existing local Java process manager. The new `server/agent.ts` is the first step toward the Panel ↔ node-daemon split; it is not a drop-in implementation of Pterodactyl Wings and does not yet provide Docker isolation or SFTP. Those are separate engineering tasks and should not be represented as completed until implemented and tested.
