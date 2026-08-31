# VOID HOST Hyper Rebuild

## Direction
Clean rebuild of the server workspace and runtime architecture, combining:
- VOID HOST glass/green visual identity
- Hyper-style polished dashboard and motion
- Pterodactyl-style server management concepts
- JTG-style realtime console and resource monitoring

## Architecture rules
- React is the source of truth for UI.
- Backend role/ownership checks are the source of truth for authorization.
- No DOM MutationObserver feature injection for core navigation or workspace.
- No duplicate helper scripts for the same UI feature.
- Panel and Node Agent are separate processes.
- Minecraft allocations are separate from the panel port.

## Roles
### Admin
- Overview
- Servers
- Create Server
- Fleet/Nodes
- Allocations
- Users
- Backups
- Server workspace with all management features
- Node/Agent controls

### Normal user
- Overview
- My Servers
- Owned server workspace
- Console
- Files
- Databases
- Schedules
- Users/Subusers
- Backups
- Network view
- Startup
- Settings
- Plugin Manager
- Mod Manager
- Modpack Manager
- No Activity tab
- No node/fleet administration
- Do not expose VPS memory limits in normal-user dashboard unless explicitly enabled by admin policy

## Server workspace
- JTG-style console composition
- Realtime log stream
- Command input
- Start/Restart/Stop/Kill
- Status and uptime
- CPU/RAM/Disk/Network resource cards
- CPU/RAM/Network history charts
- Files
- Databases
- Schedules
- Users/Subusers
- Backups
- Network allocations
- Startup settings
- Server settings
- Plugin/Mod/Modpack managers
- MOTD editor inside console/workspace

## Runtime
- Panel: configurable HTTP port, default 6969
- Node Agent: configurable agent port, default 8080
- Minecraft servers: separate allocated ports, starting at an available Minecraft range
- Docker-backed process isolation for node runtime
- Owner checks on every server endpoint
- Admin-only node and allocation administration
