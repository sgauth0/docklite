# DockLite

A minimal Docker-based hosting control panel built with Next.js 14.

- Manage containers, sites, and databases from a single neon dashboard
- Browse and edit site files directly from the sidebar
- Run and download backups, with cleanup controls

## Highlights

- **Container Control**: Start, stop, restart, logs, and live stats
- **Site Deployment**: Static, PHP, or Node templates with auto provisioning
- **Database Management**: PostgreSQL containers with auto port allocation
- **Role-Based Access**: Superadmin, admin, and user permissions
- **File Browser**: Built-in editor with upload/download
- **Backup System**: Destinations, retention cleanup, and local downloads

## Screenshots

<table>
  <tr>
    <td><img src="public/screenshots/docklite1.png" alt="DockLite Dashboard" /></td>
    <td><img src="public/screenshots/docklite2.png" alt="DockLite Containers" /></td>
  </tr>
  <tr>
    <td><img src="public/screenshots/docklite3.png" alt="DockLite Backups" /></td>
    <td><img src="public/screenshots/docklite4.png" alt="DockLite Users" /></td>
  </tr>
  <tr>
    <td><img src="public/screenshots/docklite5.png" alt="DockLite Settings" /></td>
    <td></td>
  </tr>
</table>

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- dockerode for Docker API integration
- SQLite (better-sqlite3) for data storage
- iron-session for auth sessions
- Tailwind CSS for styling

## Quick Start

### Prerequisites

- Node.js 20+
- Docker installed and running
- Access to `/var/run/docker.sock`

### Install

```bash
npm install
```

### Dev

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Access

- URL: `http://YOUR_VPS_IP:3000`
- Default Login:
  - Username: `superadmin`
  - Password: `admin`

Change the default password immediately in production.

## Project Structure

```
app/                    # Next.js app directory
  (auth)/               # Login page
  (dashboard)/          # Protected dashboard pages
  api/                  # API routes
lib/                    # Core business logic
  db.ts                 # SQLite database layer
  docker.ts             # Docker API wrapper
  auth.ts               # Session management
  templates/            # Container templates
public/                 # Static assets
types/                  # TypeScript types
```

## Security Notes

- Set `SESSION_SECRET` to a long, random string
- Restrict access to port 3000
- Ensure Docker socket permissions are locked down

## License

MIT
