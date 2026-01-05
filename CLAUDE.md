# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

DockLite is a minimal Docker-based hosting control panel built with Next.js 14. It provides container management, site deployment, database provisioning, file browsing, backups, DNS management, and role-based access control.

## Commands

### Development
```bash
npm run dev        # Start dev server on 0.0.0.0:3000
npm run build      # Production build
npm start          # Start production server on 0.0.0.0
npm run lint       # Run ESLint
```

### Database
- SQLite database stored at `data/docklite.db` (configurable via `DATABASE_PATH` env var)
- Schema migrations run automatically on startup via `lib/migrations/`
- Database layer: `lib/db.ts` (uses better-sqlite3)

### Docker
- Docker socket at `/var/run/docker.sock` (configurable via `DOCKER_SOCKET_PATH`)
- All managed containers have label `docklite.managed=true`

## Architecture

### Authentication & Authorization
- **Session management**: iron-session with encrypted cookies (no database sessions)
- **Session config**: `lib/auth.ts` - handles session setup, requires `SESSION_SECRET` env var (32+ chars in prod)
- **Role hierarchy**: `super_admin` > `admin` > `user`
  - Super admins: can manage all users and resources
  - Admins: can manage users they created and regular users
  - Users: can only manage their own resources
- **Auth helpers**:
  - `requireAuth()`: ensures user is authenticated
  - `requireAdmin()`: ensures user is admin or super admin
  - `requireRole(['super_admin'])`: role-specific checks
  - `requireSuperAdmin()`: super admin only
  - `canManageUser(managerId, targetUserId)`: hierarchy validation

### Core Architecture Layers

1. **Database Layer** (`lib/db.ts`)
   - SQLite with better-sqlite3
   - All CRUD operations for users, sites, databases, folders, backups, DNS
   - Foreign key constraints enabled
   - Migrations run on startup via `initializeDatabase()`

2. **Docker Integration** (`lib/docker.ts`)
   - dockerode client for Docker API
   - Container lifecycle: list, start, stop, restart, remove
   - Stats streaming, log retrieval
   - Automatic network creation for container templates
   - Image pulling with progress tracking

3. **Site Provisioning** (`lib/site-helpers.ts` + `lib/templates/`)
   - Sites stored at `/var/www/sites/{username}/{domain}/`
   - Templates: static (nginx), PHP (php-fpm + nginx), Node.js
   - Each template generates Docker container config with Traefik labels for routing
   - Containers auto-labeled with `docklite.managed=true` and site metadata

4. **Traefik Integration**
   - Containers use Traefik labels for HTTP routing and SSL
   - SSL certificates managed via Let's Encrypt (acme.json)
   - Traefik API queried for router/certificate status (`lib/traefik.ts`)

5. **Backup System** (scheduled via `instrumentation.ts`)
   - Destinations: local, SFTP, S3, Google Drive, Backblaze
   - Jobs: defined with cron-like frequency, retention policies
   - Scheduler: `lib/backup-scheduler.ts` (auto-started on server init)
   - History: stored in `backups` table with status tracking

6. **Container Monitor** (auto-started via `instrumentation.ts`)
   - `lib/container-monitor.ts`: tracks container lifecycle events
   - Auto-updates site status when containers stop/start

7. **Folder Organization**
   - Users can create folders (max 2 levels deep)
   - Containers can be organized into folders
   - Drag-and-drop reordering supported (position tracking)

### Next.js App Router Structure

```
app/
  (auth)/              # Login page (unauthenticated)
  (dashboard)/         # Protected dashboard routes
    page.tsx           # Main dashboard (containers view)
    containers/        # Container management
    databases/         # Database management
    backups/           # Backup configuration
    dns/               # DNS management (Cloudflare integration)
    users/             # User management (admin only)
    settings/          # System settings
    server/            # Server stats
    components/        # Shared dashboard components
  api/                 # API routes (all use Next.js Route Handlers)
    auth/              # Login/logout
    containers/        # Container operations
    databases/         # Database CRUD
    files/             # File browser/editor
    backups/           # Backup operations
    dns/               # DNS record management
    users/             # User CRUD
    ssl/               # SSL certificate status
    server/            # Server stats
```

### Key Patterns

**API Route Pattern**: All API routes follow this structure:
```typescript
import { requireAuth, requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await requireAuth(); // or requireAdmin() or requireRole([...])
  // ... business logic
  return Response.json({ data });
}
```

**Container Templates**: Located in `lib/templates/`
- Each template exports `createContainer(site: Site): Promise<string>`
- Returns container ID
- Containers are labeled with Traefik routing rules based on site domain

**Migration System**: Located in `lib/migrations/`
- Migrations numbered sequentially (001, 002, etc.)
- Each exports `up(db)` function
- Automatically applied via `runMigrations()` on startup
- Validation ensures migrations run in order

**User Hierarchy**: Admins track users they created via `managed_by` field
- Used to scope user management permissions
- Prevents admins from managing other admins' users

## Environment Variables

Required in production:
- `SESSION_SECRET`: 32+ character random string for session encryption

Optional:
- `DATABASE_PATH`: Custom SQLite database location (default: `data/docklite.db`)
- `DOCKER_SOCKET_PATH`: Custom Docker socket path (default: `/var/run/docker.sock`)
- `GOOGLE_CLOUD_PROJECT`: For Vertex AI integration
- `GOOGLE_CLOUD_LOCATION`: For Vertex AI (e.g., us-central1)
- `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`: Initial superadmin credentials

## Security Considerations

- Default credentials (dev, no seed env): username `superadmin`, password `admin`
- Change default password immediately in production
- Set `SESSION_SECRET` to a long random string in production
- Docker socket access required (container runs with socket mounted)
- Files stored at `/var/www/sites/` require appropriate host permissions

## DNS Integration

DockLite integrates with Cloudflare for DNS management:
- Store API token and account ID in `cloudflare_config` table
- Zones and records synced from Cloudflare
- `lib/cloudflare.ts` handles API interactions

## Backups

Automatic backup scheduling:
- Configured via `backup_jobs` and `backup_destinations` tables
- Scheduler runs on server startup (`instrumentation.ts`)
- Supports site and database backups
- Retention policies enforced automatically

## File Browser

- Built-in file editor at `/files` dashboard route
- API routes in `app/api/files/`
- Supports browsing `/var/www/sites/{username}/` directories
- Upload, download, edit, delete operations

## Testing Notes

- No test suite currently exists
- Manual testing required via UI or API routes
- Database migrations tested via startup initialization
