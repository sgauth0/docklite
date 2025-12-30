Here's a prompt you can paste into your CLI LLM:

I'm building DockLite, a Docker control panel for personal use. It's built with Next.js, TypeScript, SQLite, and integrates directly with Docker socket. I'm using Traefik as the reverse proxy.

Current features:

    3-tier user system (Super Admin, Tier 2 Admin, Regular Users)
    Container management (start/stop/restart)
    Site creation with templates (static/PHP/Node)
    PostgreSQL database provisioning
    Container logs viewing

I need to add these features:
1. DNS Management (Cloudflare API)

    Add/edit/delete DNS records via Cloudflare API
    Store API tokens per user in dns_providers table
    UI to manage records for domains
    Tables: dns_records (id, domain, type, name, value, ttl, created_at), dns_providers (id, user_id, provider, api_key, created_at)

2. Customizable Sidebars (20% width each side)

    Left and right sidebars with dropdown to choose content
    Options: File Browser, Live Stats, Container Logs, Database Query Panel, Search
    Collapsible with arrows, state persists in localStorage
    Use Phosphor Duotone icons (colors: #00e863 green, #d90fd9 pink)

3. File Manager (filebrowser integration)

    Embed filebrowser Docker container in sidebar
    Mount /var/www/sites with user permissions
    Proxy through Traefik with --baseurl /files
    Display in customizable sidebar option

4. Backup System

    Scheduled backups using node-cron
    Tar up site directories, pg_dump for databases
    Store in /var/backups/docklite/
    UI to list backups and restore them
    Tables: backups (id, type, target_id, backup_path, size_bytes, created_at), backup_schedules (id, target_type, target_id, frequency, enabled)

5. SSL Status Display

    Show Traefik certificate info
    Display expiry dates for domains
    Read-only (Traefik auto-renews, just display status)

6. Smart Mirror Dashboard

    Route: /mirror?token=xxx for authentication
    Display: server health (CPU/RAM/Disk with circular graphs), container status grid (color-coded), active sites count, alerts/warnings
    Auto-refresh every 5-10 seconds
    High contrast, large text, no interaction needed
    Use Tremor library for charts

Architecture decisions:

    Containers tab shows ALL containers with badges (🌸 sites, 💾 databases, ⚡ utility)
    Drag-drop folders stored in DB: folders (id, user_id, name, created_at), folder_containers (id, folder_id, container_id)
    Sites/Databases tabs are filtered shortcuts
    Traefik integration via container labels for auto-discovery

Cyberpunk aesthetic: Dark theme with cyan, pink, purple accents. Optimized for 34" ultrawide (60% center, 20% sidebars).

Which feature should I implement first? Show me the implementation plan and code structure
