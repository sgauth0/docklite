# DockLite - Docker Control Panel

**Portainer + HestiaCP hybrid** - Visual Docker management with hosting panel conveniences

Building for personal use with cyberpunk aesthetic optimized for 34" ultrawide.

## Tech Stack

- **Frontend:** Next.js + TypeScript + React
- **Backend:** Next.js API routes
- **Database:** SQLite (for metadata)
- **Docker:** Direct Docker socket integration
- **Reverse Proxy:** Traefik (auto-discovery)
- **Styling:** Custom cyberpunk theme (cyan, pink, purple)

## Current Features

- [x]  User authentication (3-tier system)
- [x]  Docker container management (start/stop/restart)
- [x]  Container logs viewing
- [x]  Site creation (static/PHP/Node templates)
- [x]  Database provisioning (PostgreSQL)
- [x]  Folder organization (drag-drop)
- [x]  Container detection/import

## User System (3-Tier)

### Super Admin (user_id = 1)

- Emergency backdoor
- System setup
- Create/promote Tier 2 admins
- Never actually log in as this

### Tier 2 Admin (Daily Driver)

- Create regular users
- See all users' sites (filtered by default)
- Full access to everything
- Default view: only their managed users
- Toggle to see ALL users

### Regular Users (Project Namespaces)

- Own sites/databases/containers only
- Filesystem isolation: `/var/www/sites/{username}/`
- Used for organization (ioi, tools, personal, media)

## Architecture Decisions

### Containers Tab = Everything

- Shows ALL DockLite containers
- Badges: 🌸 sites, 💾 databases, ⚡ utility
- Drag-drop folders for organization
- Filter dropdown: All / Sites / Databases / Other

### Sites Tab = Shortcut View

- Filtered view of site containers
- Table with domain/template/actions
- Quick access

### Databases Tab = Moving to Containers

- Will become a filter in main Containers tab
- Keep as separate view for quick access

## Features to Add

### DNS Management

- Cloudflare API integration
- Add/edit/delete records
- Store API tokens per user
- Later: other providers (DO, Namecheap)

### File Manager

- filebrowser in sidebar (20% width)
- Browse `/var/www/sites/{user}/{domain}/`
- Edit code files inline
- Upload/download

### Backups

- Scheduled backups (node-cron)
- Tar up site directories
- pg_dump for databases
- Store in `/var/backups/docklite/`
- UI to list + restore

### SSL Status

- Display Traefik cert info
- Show expiry dates
- Traefik auto-renews (just display status)

### DockLite DB Viewer

- Inspect SQLite database
- View schema, browse tables
- Read-only for debugging

## UI/UX Design

### Ultrawide Optimization (34")

**Layout:**

```
┌──────────────┬─────────────────────┬──────────────┐
│   Sidebar    │   Main Content      │   Sidebar    │  
│   (20%)      │      (60%)          │   (20%)      │
└──────────────┴─────────────────────┴──────────────┘
```

**Customizable Sidebars:**

- 📁 File Browser
- 📊 Live Stats (Tremor charts)
- 📜 Container Logs (streaming)
- 💾 Database Query Panel
- 🔍 Search

**Settings:**

- Left Sidebar dropdown (choose content)
- Right Sidebar dropdown (choose content)
- Both collapsible with arrows
- State persists

### Icon System

- Moving away from emojis
- **Phosphor Icons Duotone**
- Colors: `#00e863` (green), `#d90fd9` (pink)
- Sharp, tech aesthetic

## Docker Integration

### Container Labels

```jsx
Labels: {
  'docklite.managed': 'true',
  'docklite.type': 'site', // site/database/utility
  'docklite.template': 'static', // static/php/node  
  'docklite.domain': domain,
  'docklite.user_id': userId.toString(),
  'docklite.created_at': timestamp,
}
```

### Traefik Integration

```jsx
// Auto-routing labels
'traefik.enable': 'true',
'traefik.http.routers.${domain}.rule': `Host(\`${domain}\`)`,
'traefik.http.routers.${domain}.entrypoints': 'websecure',  
'traefik.http.routers.${domain}.tls.certresolver': 'letsencrypt',
```

## Database Schema

```sql
users
- id
- username
- password_hash
- is_admin
- is_super_admin  
- managed_by (nullable, FK to [users.id](http://users.id))
- created_at

sites
- id
- domain
- container_id
- user_id
- template_type
- code_path
- status
- created_at

databases
- id  
- name
- container_id
- postgres_port
- created_at

database_permissions
- id
- user_id
- database_id

folders
- id
- user_id
- name
- created_at

folder_containers
- id
- folder_id  
- container_id

dns_records
- id
- domain
- type (A/CNAME/MX/TXT)
- name
- value
- ttl
- created_at

dns_providers
- id
- user_id
- provider (cloudflare/do)
- api_key
- created_at

backups
- id
- type (site/database)
- target_id
- backup_path  
- size_bytes
- created_at

backup_schedules
- id
- target_type
- target_id
- frequency
- enabled
```

## Why DockLite?

- HestiaCP/CloudPanel too bloated
- Want exactly what I need
- Docker-native (not abstracted)
- Cyberpunk aesthetic
- Ultrawide-optimized
- Learning opportunity
