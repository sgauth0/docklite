# DockLite

A minimal Docker-based web hosting control panel built with Next.js.

## Features

- **Container Management**: Start, stop, restart, and monitor Docker containers
- **Site Deployment**: Deploy static, PHP, or Node.js sites with automatic container creation
- **Database Management**: Create and manage PostgreSQL database containers
- **User Authentication**: Admin and regular user roles with permissions
- **Real-time Logs**: View container logs directly in the UI
- **Resource Monitoring**: CPU and memory usage stats for running containers

## Screenshots

![DockLite Dashboard](public/screenshots/docklite1.png)
![DockLite Containers](public/screenshots/docklite2.png)
![DockLite Backups](public/screenshots/docklite3.png)
![DockLite Users](public/screenshots/docklite4.png)
![DockLite Settings](public/screenshots/docklite5.png)

## Tech Stack

- **Next.js 14** with App Router and TypeScript
- **dockerode** for Docker API integration
- **SQLite** (better-sqlite3) for data storage
- **iron-session** for cookie-based authentication
- **Tailwind CSS** for UI styling

## Getting Started

### Prerequisites

- Node.js 20+
- Docker installed and running
- Access to Docker socket (`/var/run/docker.sock`)

### Installation

The application is already set up and running!

```bash
# Development server (already running)
npm run dev

# Production build
npm run build
npm start
```

### Access the Application

- **URL**: http://YOUR_VPS_IP:3000
- **Default Login**:
  - Username: `superadmin`
  - Password: `admin`

**IMPORTANT**: Change the default admin password in production!

## Usage Guide

### 1. Login

Navigate to `http://YOUR_VPS_IP:3000/login` and use the default credentials.

### 2. View Existing Containers

The dashboard shows all Docker containers on your VPS:
- For admin: All containers
- For regular users: Only assigned containers

### 3. Create a New Site

1. Click **Create Site**
2. Fill in the form:
   - **Domain**: Your site domain (e.g., example.com)
   - **Site Type**:
     - Static: HTML/CSS/JS served by nginx
     - PHP: nginx + PHP-FPM for PHP applications
     - Node.js: Node.js runtime
   - **Code Path**: Full path to your code directory (e.g., `/var/www/example.com`)

3. Click **Create Site**

The system will:
- Pull the required Docker image
- Create and start the container
- Assign a random port for web access
- Store the site in the database

### 4. Manage Sites

From the dashboard, you can:
- **Start/Stop/Restart** containers
- **View logs** and resource usage
- **Delete** sites (removes container and database entry)

### 5. Create Databases

1. Navigate to **Databases**
2. Click **Create Database**
3. Enter a database name
4. **Save the connection credentials** shown after creation

Each database:
- Runs in its own PostgreSQL container
- Gets a unique port (starting from 5432)
- Has a randomly generated password

### 6. Connect to Databases

Use the connection info shown after creation:

```bash
psql -h localhost -p 5432 -U docklite -d your_database_name
```

## Project Structure

```
/home/docklite/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Login page
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── lib/                   # Core business logic
│   ├── db.ts              # SQLite database layer
│   ├── docker.ts          # Docker API wrapper
│   ├── auth.ts            # Session management
│   └── templates/         # Container templates
├── types/                 # TypeScript types
└── data/                  # SQLite database file
```

## Database Schema

### Users
- Admin and regular user accounts
- Bcrypt-hashed passwords

### Sites
- Container metadata
- User assignments
- Template type (static/php/node)

### Databases
- PostgreSQL container info
- Port mappings

### Permissions
- Database access control

## Docker Templates

### Static Sites (nginx)
```
Image: nginx:alpine
Binds: /path/to/code → /usr/share/nginx/html
```

### PHP Sites (nginx + PHP-FPM)
```
Image: webdevops/php-nginx:8.2-alpine
Binds: /path/to/code → /app
```

### Node.js Sites
```
Image: node:20-alpine
Binds: /path/to/code → /app
Command: npm start
```

## Security Notes

1. **Change default credentials**: Update admin password immediately
2. **Update session secret**: Change `SESSION_SECRET` in `.env.local`
3. **Network access**: Currently accessible on port 3000 - restrict as needed
4. **Docker socket**: Requires access to `/var/run/docker.sock`

## Next Steps

### Reverse Proxy Setup

To access sites via domain names:

1. Set up nginx as a reverse proxy on the host
2. Configure DNS at Cloudflare
3. Use Traefik labels or manual nginx config to route traffic

Example nginx config:
```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:CONTAINER_PORT;
        proxy_set_header Host $host;
    }
}
```

### SSL/TLS Certificates

Use Certbot with nginx for Let's Encrypt certificates.

### Production Deployment

```bash
# Build for production
npm run build

# Run with PM2 or systemd
pm2 start npm --name docklite -- start
```

## Troubleshooting

### Cannot connect to Docker
- Ensure Docker is running: `docker ps`
- Check socket permissions: `ls -l /var/run/docker.sock`

### Database errors
- Check `/home/docklite/data/docklite.db` exists
- Ensure write permissions on data directory

### Port conflicts
- Port 3000 is in use: Change port in package.json dev script
- Database port conflicts: Ports are auto-assigned starting from 5432

## Development

### Adding New Features

1. **New container template**: Add to `lib/templates/`
2. **New API route**: Add to `app/api/`
3. **New page**: Add to `app/(dashboard)/`

### Database Queries

All database operations are in `lib/db.ts`. Use prepared statements for security.

## Support

For issues or questions, check:
- Next.js docs: https://nextjs.org/docs
- dockerode docs: https://github.com/apocas/dockerode
- SQLite docs: https://www.sqlite.org/docs.html

## License

MIT
