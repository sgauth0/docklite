# DockLite User Permissions & Access Control

This document outlines the permission system implemented in DockLite.

## User Roles

### Admin Users (`is_admin = 1`)
- Full access to all features
- Can view and manage all sites from all users
- Can access all directories under `/var/www/sites/`
- Can create sites for any user
- Can manage all users

### Regular Users (`is_admin = 0`)
- Can only view and manage their own sites
- Can only access their own directory: `/var/www/sites/{username}/`
- Can only create sites for themselves
- Cannot manage other users

## Site Visibility

**Dashboard (`/`):**
- Admins: See all sites and containers from all users
- Users: Only see their own sites and containers
- Empty state: Shows "No containers detected" message with link to create first site

**Sites Page (`/sites`):**
- Same filtering as dashboard
- Users without sites see the empty state

## File Manager Access

The File Manager has role-based directory restrictions:

### Admin Users
- **Starting directory:** `/var/www/sites/`
- **Can access:** All subdirectories (all user folders)
- **Example:** Can browse `/var/www/sites/stella/`, `/var/www/sites/admin/`, etc.

### Regular Users
- **Starting directory:** `/var/www/sites/{username}/`
- **Can access:** Only their own directory and subdirectories
- **Restricted from:** Other users' directories and parent directory
- **Example:** User "stella" can only access `/var/www/sites/stella/` and below

### File Manager Features
- ✅ Open/Close toggle (collapsible sidebar)
- ✅ Browse directories
- ✅ Upload files
- ✅ Download files
- ✅ Edit text files
- ✅ Permission-based access control

## Directory Structure

```
/var/www/sites/
├── admin/              # Admin user's sites
│   └── example.com/
│       └── index.html
├── stella/             # Regular user "stella"
│   └── sgauth0.com/
│       └── index.html
└── testuser/           # Regular user "testuser"
    └── (no sites yet)
```

## API Endpoints with Permission Checks

### Files API

**GET `/api/files`** - List directory contents
- Admins: Can list any path under `/var/www/sites/`
- Users: Can only list paths under `/var/www/sites/{username}/`

**GET `/api/files/content`** - Read file content
- Same restrictions as above

**POST `/api/files/content`** - Write/Edit file
- Same restrictions as above

**POST `/api/files/upload`** - Upload file
- Same restrictions as above

**GET `/api/files/download`** - Download file
- Same restrictions as above

### Sites API

**GET `/api/sites`** - List sites
- Returns only sites the user has permission to view

**POST `/api/sites`** - Create site
- Admins: Can create for any user (specify `user_id`)
- Users: Can only create for themselves (ignores `user_id` parameter)

**GET `/api/sites/:id`** - Get site details
- Only returns if user owns the site or is admin

**DELETE `/api/sites/:id`** - Delete site
- Only allows deletion if user owns the site or is admin

### Containers API

**GET `/api/containers`** - List containers
- Filters containers to only show those belonging to user's sites
- Admins see all containers

## Security Implementation

### Path Traversal Prevention
All file API endpoints use:
```typescript
const resolvedPath = path.resolve(filePath);
if (!resolvedPath.startsWith('/var/www/sites')) {
  return 403 Forbidden;
}
```

### User-Specific Path Restrictions
For non-admin users:
```typescript
if (!userSession.isAdmin) {
  const userPath = `/var/www/sites/${user.username}`;
  if (!resolvedPath.startsWith(userPath)) {
    return 403 Forbidden;
  }
}
```

### Database-Level Filtering
```typescript
// In lib/db.ts
export function getSitesByUser(userId: number, isAdmin: boolean): Site[] {
  if (isAdmin) {
    return db.prepare('SELECT * FROM sites').all();
  }
  return db.prepare('SELECT * FROM sites WHERE user_id = ?').all(userId);
}
```

## Default Users

1. **admin** (Admin)
   - Username: `admin`
   - Password: `admin` (change in production!)
   - Full access to everything

2. **stella** (Regular User)
   - Can only access `/var/www/sites/stella/`
   - Can only see and manage own sites

3. **testuser** (Regular User)
   - Can only access `/var/www/sites/testuser/`
   - Currently has no sites (shows empty state)

## Testing Permissions

To test regular user permissions:
1. Login as `stella` (or another non-admin user)
2. Try to navigate in File Manager - should be restricted to `/var/www/sites/stella/`
3. Try to create a site - should only create under your username
4. View dashboard - should only see your own sites
5. Try to access another user's path via API - should get 403 Forbidden

To test admin permissions:
1. Login as `admin`
2. File Manager should start at `/var/www/sites/` and allow browsing all users
3. Can see all sites from all users on dashboard
4. Can create sites for any user
