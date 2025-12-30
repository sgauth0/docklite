# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DockLite is a Docker-based web hosting control panel built with Next.js 14. It provides a web interface for managing Docker containers, deploying sites, and managing PostgreSQL databases.

**Core Technology Stack:**
- Next.js 14 with App Router and TypeScript
- dockerode for Docker API integration
- better-sqlite3 for SQLite database
- iron-session for cookie-based authentication
- Tailwind CSS for styling

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
   - Tables: users, sites, databases, database_permissions, sessions
   - Auto-initializes database and seeds admin user on startup

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

## Database Schema

**users** - User accounts with bcrypt-hashed passwords
- `id`, `username`, `password_hash`, `is_admin` (0/1), `created_at`

**sites** - Deployed websites
- `id`, `domain`, `container_id`, `user_id`, `template_type`, `code_path`, `status`, `created_at`

**databases** - PostgreSQL containers
- `id`, `name`, `container_id`, `postgres_port`, `created_at`
- Ports auto-assigned starting from 5432 (via `getNextAvailablePort()`)

**database_permissions** - Access control for databases
- Links `user_id` to `database_id`

**sessions** - Session storage (though iron-session uses cookies)

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

## Environment Variables

- `SESSION_SECRET` - iron-session encryption key (MUST be 32+ chars in production)
- `NODE_ENV` - affects cookie security settings

## File Organization

```
lib/
  ├── db.ts              # Database operations (sync)
  ├── docker.ts          # Docker operations (async)
  ├── auth.ts            # Session helpers
  ├── site-helpers.ts    # Site directory management
  ├── site-detector.ts   # Import existing containers
  └── templates/         # Container config generators

app/
  ├── (auth)/            # Login page (unauthenticated)
  ├── (dashboard)/       # Protected pages (layout checks auth)
  └── api/               # API routes
      ├── auth/          # Login, logout, me
      ├── containers/    # Container control (start/stop/restart/logs)
      ├── sites/         # Site CRUD + import
      ├── databases/     # Database CRUD
      └── users/         # User management (admin only)

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

## Testing

No test suite currently exists. Manual testing via:
1. Start dev server
2. Login at http://localhost:3000/login
3. Test site creation/management via UI
4. Use debug endpoints to verify system health
