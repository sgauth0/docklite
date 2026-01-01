# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DockLite is a Docker-based web hosting control panel built with Next.js 14. It provides a web interface for managing Docker containers, deploying sites, and managing PostgreSQL databases.

**Core Technology Stack:**
- Next.js 14 with App Router and TypeScript
- dockerode for Docker API integration
- better-sqlite3 for SQLite database (with migration system)
- iron-session for cookie-based authentication
- Tailwind CSS with vaporwave/cyber-kawaii theme

## Common Development Commands

```bash
# Development server (binds to 0.0.0.0)
npm run dev

# Production build and start
npm run build
npm start

# Linting
npm run lint
```

## Architecture Overview

### Three-Layer Architecture

1. **Data Layer** (`lib/db.ts`)
   - SQLite database with better-sqlite3
   - All database operations are synchronous prepared statements
   - Tables: users, sites, databases, database_permissions, folders, folder_containers
   - Auto-initializes database and seeds admin user on startup
   - Migration system in `lib/migrations/` with versioning and rollback support

2. **Docker Layer** (`lib/docker.ts`)
   - Async wrapper around dockerode
   - Docker socket: `/var/run/docker.sock`
   - All Docker operations (list, start, stop, restart, logs, stats, create)
   - Image pulling with progress tracking

3. **API Layer** (`app/api/**/route.ts`)
   - Next.js route handlers
   - Authentication via iron-session (session helpers in `lib/auth.ts`)
   - RESTful endpoints for containers, sites, databases, users

### Container Templates System

Templates define Docker container configurations for different site types:

- **Static** (`lib/templates/static.ts`): nginx:alpine serving from `/usr/share/nginx/html`
- **PHP** (`lib/templates/php.ts`): webdevops/php-nginx:8.2-alpine serving from `/app`
- **Node** (`lib/templates/node.ts`): node:20-alpine running `npm start`
- **Database** (`lib/templates/database.ts`): postgres:16-alpine with auto-generated passwords

All managed containers have labels:
- `docklite.managed=true`
- `docklite.domain=<domain>`
- `docklite.type=<static|php|node|postgres>`

### Traefik Integration

DockLite uses Traefik v2.10 as a reverse proxy for automatic SSL and routing:

**Network Architecture:**
- All site containers connect to `docklite_network` Docker bridge network
- Traefik container listens on ports 80 (HTTP) and 443 (HTTPS)
- HTTP traffic automatically redirects to HTTPS
- Traefik reads Docker labels to configure routing dynamically

**Automatic SSL Certificates:**
- Let's Encrypt integration via HTTP challenge
- Certificates stored in `traefik-data/letsencrypt/acme.json`
- Automatic renewal before expiration

**Container Labels for Routing:**
Each site container includes Traefik labels:
```typescript
'traefik.enable': 'true',
'traefik.http.routers.docklite-{domain}.rule': 'Host(`{domain}`)',
'traefik.http.routers.docklite-{domain}.entrypoints': 'websecure',
'traefik.http.routers.docklite-{domain}.tls': 'true',
'traefik.http.routers.docklite-{domain}.tls.certresolver': 'letsencrypt',
'traefik.http.services.docklite-{domain}.loadbalancer.server.port': '{port}'
```

**Setup:**
1. Run `./setup-traefik.sh` to create network and directories
2. Update `ACME_EMAIL` in `.env.traefik`
3. Start Traefik: `docker-compose -f docker-compose.traefik.yml --env-file .env.traefik up -d`

See `TRAEFIK_SETUP.md` for detailed configuration and troubleshooting.

### Site Management

**Site Creation Flow:**
1. User provides domain, site type, and code path
2. Template generates Docker container config
3. Image pulled if needed (via `pullImage()`)
4. Container created and started (via `createContainer()`)
5. Site record saved to database with container ID

**Site Path Convention:**
- Default: `/var/www/sites/{username}/{domain}/`
- Helpers in `lib/site-helpers.ts` create directories and default files
- Auto-creates index.html/index.php/index.js based on type

### Authentication & Authorization

**Session Management:**
- iron-session with cookie-based sessions
- Session secret from `SESSION_SECRET` env var (defaults to insecure value)
- Helper functions in `lib/auth.ts`:
  - `requireAuth()` - throws if not authenticated
  - `requireAdmin()` - throws if not admin
  - `getCurrentUser()` - returns UserSession or null

**Permission Model:**
- Three-tier user hierarchy: super_admin → admin → user
- Users have `role` field ('super_admin', 'admin', 'user') and `managed_by` relationship
- Admins see all containers/sites/databases
- Regular users only see their assigned resources
- Database access controlled via `database_permissions` table

### Site Detection & Import

The `lib/site-detector.ts` module can analyze running containers and detect websites:

- Detects web servers by exposed ports (80, 443, 8080, 3000, 8000)
- Supports Traefik multi-site containers (reads labels to extract multiple domains)
- Infers site type from Docker image (nginx→static, php→php, node→node)
- Extracts code paths from bind mounts
- Returns confidence level (high/medium/low)
- Import feature at `/sites/import` for existing containers

### Folder Organization System

Containers can be organized into user-defined folders with drag-and-drop UI:

**Database Structure:**
- `folders` table: user-owned folders with names
- `folder_containers` junction table: links containers to folders
- Each user has a default "Default" folder (protected from deletion)

**API Operations:**
- Full REST API at `/api/folders` and `/api/folders/[id]`
- `moveContainerToFolder()` atomically moves containers between folders
- Containers can only belong to one folder at a time
- Unassigned containers automatically go to Default folder

**UI Components:**
- `FolderSection.tsx`: collapsible folder sections with container counts
- `ContainerCard.tsx`: draggable container cards
- `SidebarPanel.tsx`: customizable sidebars (File Browser, Stats, Logs, Database Query, Search)
- Drag-and-drop uses HTML5 API with visual feedback

### Database Migrations

**Migration System** (`lib/migrations/`)
- Versioned migrations with automatic execution on startup
- Each migration has `up` and `down` functions for rollback
- Automatic checksum validation to detect modified migrations
- Auto-backup before first migration run
- Migration tracking in `migrations` table

**Current Migrations:**
- 001: Initial schema
- 002: User roles (super_admin, admin, user)
- 003: Site extensions (code_path, status, folder_id)
- 004: Folders and folder_containers tables
- 005: Migrate existing data to folder structure
- 006: Drop sessions table (iron-session uses cookies)

**Pattern for New Migrations:**
```typescript
// lib/migrations/007_description.ts
import type { Migration } from './types';

export const version = '007';
export const name = 'description';

export function up(db: Database): void {
  db.exec(`ALTER TABLE ...`);
}

export function down(db: Database): void {
  db.exec(`DROP TABLE ...`);
}
```

Then add to `lib/migrations/index.ts` imports and array.

## Database Schema

**users** - User accounts with bcrypt-hashed passwords
- `id`, `username`, `password_hash`, `is_admin` (0/1), `role` (super_admin/admin/user), `is_super_admin` (0/1), `managed_by` (user_id), `created_at`

**sites** - Deployed websites
- `id`, `domain`, `container_id`, `user_id`, `template_type`, `code_path`, `status`, `folder_id`, `created_at`

**folders** - User-defined container folders
- `id`, `user_id`, `name`, `created_at`

**folder_containers** - Container-to-folder assignments
- `id`, `folder_id`, `container_id`, `created_at`

**databases** - PostgreSQL containers
- `id`, `name`, `container_id`, `postgres_port`, `created_at`
- Ports auto-assigned starting from 5432 (via `getNextAvailablePort()`)

**database_permissions** - Access control for databases
- Links `user_id` to `database_id`

## Key Patterns

### Error Handling in Docker Operations

Docker operations handle 304 status (already started/stopped) as success:
```typescript
catch (error: any) {
  if (error.statusCode === 304) {
    return; // Not an error
  }
  throw new Error(`Failed: ${error.message}`);
}
```

### Port Auto-Assignment

- Sites use `HostPort: '0'` for random assignment
- Databases use sequential ports from 5432+ (calculated in `lib/db.ts`)
- Port mappings formatted as `hostPort→containerPort`

### Database Query Pattern

All queries use prepared statements:
```typescript
db.prepare('SELECT * FROM sites WHERE id = ?').get(id)
db.prepare('INSERT INTO sites (...) VALUES (?, ?, ?)').run(...)
```

### API Route Pattern

Standard structure for protected routes:
```typescript
export async function GET() {
  try {
    const user = await requireAuth();
    // ... perform operation
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Debug Tools

Debug endpoints for troubleshooting:
- `/api/debug` - JSON status of database, Docker, and auth
- `/debug` - Web dashboard with auto-refresh (see DEBUG_GUIDE.md)

## Additional Features

### File Management
- Full file browser in `/api/files` and FileManager component
- Upload, download, edit, and delete files within site directories
- Supports viewing and editing code files directly in the UI

### SSL Management
- SSL certificate status checking via `/api/ssl`
- Integration ready for certificate management
- SSL status component for sites

### Server Monitoring
- Real-time server stats (CPU, memory, disk) at `/api/server/stats`
- Container stats (CPU, memory usage) at `/api/containers/[id]/stats`
- Database connection stats at `/api/databases/stats`

## Environment Variables

- `SESSION_SECRET` - iron-session encryption key (MUST be 32+ chars in production)
- `NODE_ENV` - affects cookie security settings
- `DATABASE_PATH` - Custom SQLite database path (default: `data/docklite.db`)
- `DOCKER_SOCKET_PATH` - Custom Docker socket path (default: `/var/run/docker.sock`)

## File Organization

```
lib/
  ├── db.ts              # Database operations (sync)
  ├── docker.ts          # Docker operations (async)
  ├── auth.ts            # Session helpers
  ├── site-helpers.ts    # Site directory management
  ├── site-detector.ts   # Import existing containers
  ├── user-helpers.ts    # User folder initialization
  ├── cache.ts           # Caching utilities
  ├── traefik.ts         # Traefik reverse proxy helpers
  ├── migrations/        # Database migration system
  │   ├── index.ts       # Migration runner with rollback
  │   ├── types.ts       # Migration type definitions
  │   ├── validate.ts    # Migration validation
  │   └── 00X_*.ts       # Individual migration files
  ├── templates/         # Container config generators
  │   ├── static.ts      # nginx:alpine
  │   ├── php.ts         # webdevops/php-nginx:8.2-alpine
  │   ├── node.ts        # node:20-alpine
  │   └── database.ts    # postgres:16-alpine
  └── hooks/             # Custom lifecycle hooks

app/
  ├── (auth)/            # Login page (unauthenticated)
  ├── (dashboard)/       # Protected pages (layout checks auth)
  │   ├── page.tsx       # Main container dashboard with folders
  │   ├── layout.tsx     # Dashboard layout with sidebars
  │   ├── nav.tsx        # Navigation component
  │   ├── components/    # Reusable dashboard components
  │   │   ├── FolderSection.tsx      # Folder display with drag-drop
  │   │   ├── ContainerCard.tsx      # Draggable container cards
  │   │   ├── SidebarPanel.tsx       # Customizable sidebars
  │   │   ├── FileManager.tsx        # File browser
  │   │   ├── ContainerDetailsModal.tsx
  │   │   └── ...
  │   ├── sites/         # Site management pages
  │   ├── databases/     # Database management pages
  │   ├── users/         # User management pages
  │   ├── server/        # Server stats page
  │   └── settings/      # Settings pages
  └── api/               # API routes
      ├── auth/          # Login, logout, me
      ├── containers/    # Container control (start/stop/restart/logs)
      ├── sites/         # Site CRUD + import
      ├── databases/     # Database CRUD
      ├── folders/       # Folder CRUD and container linking
      ├── users/         # User management (admin only)
      ├── files/         # File operations (upload, download, browse)
      ├── server/        # Server stats
      ├── ssl/           # SSL certificate management
      └── debug/         # Debug endpoints

types/index.ts           # Shared TypeScript types
data/docklite.db         # SQLite database file
```

## Default Credentials

- Username: `admin`
- Password: `admin`

**CRITICAL:** These are seeded on first run. Change immediately in production via Settings > Change Password.

## Docker Requirements

- Docker daemon must be running
- App needs access to `/var/run/docker.sock`
- Containers managed by DockLite have `docklite.managed=true` label

## UI Theme & Design System

DockLite uses a vaporwave/cyber-kawaii aesthetic with the following design elements:

**Color Palette:**
- Neon cyan, pink, purple, and green accents
- Glassmorphism effects (backdrop-blur)
- Gradient backgrounds (purple-to-cyan)
- Dark mode optimized

**Key Components:**
- `.btn-neon` - Gradient buttons with glow effects
- `.card-vapor` - Glassmorphism cards
- `.input-vapor` - Styled form inputs
- `.neon-text` - Glowing text effects
- Vertical neon accent lines on sidebars (pink → purple → cyan gradients)

**Layout Patterns:**
- Responsive grid (1-5 columns based on screen width)
- Ultrawide monitor optimization (3440px+)
- Sidebars: 20vw width each, overlaying main content
- Max content width: 1400px for main areas, 1024px for navigation

**Icons:**
- Uses @phosphor-icons/react for consistent iconography
- Emoji badges for container types: 🌸 sites, 💾 databases, ⚡ utility

## Testing

No test suite currently exists. Manual testing via:
1. Start dev server
2. Login at http://localhost:3000/login
3. Test site creation/management via UI
4. Use debug endpoints to verify system health

## Important Implementation Notes

### When Adding New Database Tables
1. Create migration file in `lib/migrations/00X_description.ts`
2. Implement `up` and `down` functions
3. Add to imports and array in `lib/migrations/index.ts`
4. Migration runs automatically on next server start
5. Add TypeScript types to `types/index.ts`
6. Add database helper functions to `lib/db.ts`

### When Adding API Routes
- Always use `requireAuth()` or `requireAdmin()` for protected endpoints
- Use try-catch with proper error responses
- Return JSON with consistent structure: `{ data }` or `{ error }`
- Handle Docker 304 status codes as success (already started/stopped)

### When Working with Containers
- Always check for `docklite.managed=true` label to filter managed containers
- Container IDs are Docker's full IDs (not truncated)
- Port mappings: use `HostPort: '0'` for random assignment
- Images may need pulling before container creation (check `pullImage()`)

### Folder System
- Never delete or modify the "Default" folder
- Use `moveContainerToFolder()` instead of manual link/unlink operations
- Containers can only be in one folder at a time
- All folder operations should be atomic (use database transactions if needed)
