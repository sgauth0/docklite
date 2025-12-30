# DockLite - Docker-based Web Hosting Control Panel

## Project Overview

DockLite is a minimal Docker-based web hosting control panel built with Next.js 14. It provides a web interface for managing Docker containers, deploying websites, and managing PostgreSQL databases with user authentication and role-based access control.

**Core Technology Stack:**
- **Next.js 14** with App Router and TypeScript
- **dockerode** for Docker API integration
- **better-sqlite3** for SQLite database (synchronous operations)
- **iron-session** for cookie-based authentication
- **Tailwind CSS** for UI styling

## Architecture

### Three-Layer Architecture

1. **Data Layer** (`lib/db.ts`)
   - SQLite database with better-sqlite3 (synchronous operations)
   - All database operations use prepared statements for security
   - Tables: users, sites, databases, database_permissions, sessions
   - Auto-initializes database and seeds admin user on startup
   - Database file: `data/docklite.db`

2. **Docker Layer** (`lib/docker.ts`)
   - Async wrapper around dockerode
   - Docker socket: `/var/run/docker.sock` (requires access)
   - Operations: list, start, stop, restart, logs, stats, create containers
   - Image pulling with progress tracking

3. **API Layer** (`app/api/**/route.ts`)
   - Next.js route handlers with dynamic export
   - Authentication via iron-session (helpers in `lib/auth.ts`)
   - RESTful endpoints for containers, sites, databases, users

### Container Templates System

Templates in `lib/templates/` define Docker configurations for different site types:

- **Static** (`static.ts`): nginx:alpine serving from `/usr/share/nginx/html`
- **PHP** (`php.ts`): webdevops/php-nginx:8.2-alpine serving from `/app`
- **Node** (`node.ts`): node:20-alpine running `npm start`
- **Database** (`database.ts`): postgres:16-alpine with auto-generated passwords

All managed containers have labels:
- `docklite.managed=true`
- `docklite.domain=<domain>`
- `docklite.type=<static|php|node|postgres>`

## Development Commands

```bash
# Development server (binds to 0.0.0.0:3000)
npm run dev

# Production build
npm run build

# Production start (binds to 0.0.0.0:3000)
npm start

# Linting
npm run lint
```

## Code Organization

```
app/
├── (auth)/            # Login page (unauthenticated)
├── (dashboard)/       # Protected pages (layout checks auth)
│   ├── components/    # React components (ContainerCard, Folder)
│   ├── settings/      # User management and password change
│   └── sites/         # Site management pages
└── api/               # API routes
    ├── auth/          # Login, logout, me endpoints
    ├── containers/    # Container control (start/stop/restart/logs)
    ├── sites/         # Site CRUD + import existing containers
    ├── databases/     # Database CRUD
    └── users/         # User management (admin only)

lib/
├── db.ts              # Database operations (sync)
├── docker.ts          # Docker operations (async)
├── auth.ts            # Session helpers (requireAuth, requireAdmin)
├── site-helpers.ts    # Site directory management
├── site-detector.ts   # Import existing containers
└── templates/         # Container config generators

types/index.ts         # Shared TypeScript interfaces
```

## Database Schema

**users**: User accounts with bcrypt-hashed passwords
- `id`, `username`, `password_hash`, `is_admin` (0/1), `created_at`

**sites**: Deployed websites
- `id`, `domain`, `container_id`, `user_id`, `template_type`, `code_path`, `status`, `created_at`

**databases**: PostgreSQL containers
- `id`, `name`, `container_id`, `postgres_port`, `created_at`
- Ports auto-assigned starting from 5432

**database_permissions**: User access control for databases
- Links `user_id` to `database_id`

**sessions**: Session storage (iron-session uses cookies)

## Key Patterns

### Authentication Pattern
All protected API routes use:
```typescript
const user = await requireAuth(); // Throws if unauthorized
const user = await requireAdmin(); // Throws if not admin
```

### Error Handling for Docker Operations
Docker operations handle 304 status (already started/stopped) as success:
```typescript
catch (error: any) {
  if (error.statusCode === 304) {
    return; // Not an error
  }
  throw new Error(`Failed: ${error.message}`);
}
```

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

## Site Management Flow

1. **Site Creation**: User provides domain, site type, and code path
2. **Template Generation**: Creates Docker container configuration
3. **Image Pull**: Pulls required image if needed via `pullImage()`
4. **Container Creation**: Creates and starts container via `createContainer()`
5. **Database Record**: Saves site record with container ID

**Site Path Convention**: `/var/www/sites/{username}/{domain}/`
- Auto-creates directories and default files (index.html/index.php/index.js)
- Helpers in `lib/site-helpers.ts`

## Port Management

- **Sites**: Use `HostPort: '0'` for random port assignment
- **Databases**: Sequential ports starting from 5432 (calculated in `lib/db.ts`)
- Port mappings formatted as `hostPort→containerPort`

## Security Considerations

1. **Default Credentials**: Username `admin`, Password `admin` (MUST change in production)
2. **Session Secret**: Change `SESSION_SECRET` in `.env.local` (minimum 32 characters)
3. **Docker Socket**: Requires access to `/var/run/docker.sock`
4. **Network Access**: Currently accessible on port 3000 - restrict as needed

## Debug Tools

- **API Debug**: `/api/debug` - JSON status of database, Docker, and auth
- **Web Debug**: `/debug` - Dashboard with auto-refresh (see DEBUG_GUIDE.md)
- **Auth Debug**: `/debug-auth` - Authentication status

## Environment Variables

- `SESSION_SECRET`: iron-session encryption key (MUST be 32+ chars in production)
- `NODE_ENV`: affects cookie security settings

## Testing Strategy

No automated test suite exists. Manual testing process:
1. Start development server
2. Login at http://localhost:3000/login
3. Test site creation/management via UI
4. Use debug endpoints to verify system health

## Deployment Notes

- Requires Docker daemon running
- Needs access to `/var/run/docker.sock`
- Containers managed by DockLite have `docklite.managed=true` label
- Default build output goes to `.next/` directory

## Common Issues

1. **Docker Connection**: Ensure Docker is running and socket permissions are correct
2. **Database Errors**: Check `data/docklite.db` exists and has write permissions
3. **Port Conflicts**: Port 3000 in use - modify package.json dev script
4. **Session Issues**: Verify SESSION_SECRET is set and ≥32 characters