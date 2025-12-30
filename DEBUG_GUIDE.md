# DockLite Debug Guide

## Overview

This guide explains how to use the debug tools created to troubleshoot the "not-found" error in the DockLite app. The debug tools help identify issues with database connection, Docker connection, and authentication.

## Debug Endpoints

### 1. API Debug Endpoint
**URL:** `/api/debug`
**Method:** GET
**Description:** Returns JSON with detailed status information for all system components.

**Usage:**
```bash
curl http://localhost:3000/api/debug
```

**Response Example:**
```json
{
  "status": "healthy",
  "debug": {
    "timestamp": "2025-12-18T09:44:45.660Z",
    "database": {
      "status": "connected",
      "error": null,
      "details": {
        "path": "/home/docklite/data/docklite.db",
        "userCount": 1,
        "tables": [{"name": "users"}, {"name": "sites"}, ...]
      }
    },
    "docker": {
      "status": "connected",
      "error": null,
      "details": {
        "containerCount": 10,
        "containers": [...]
      }
    },
    "authentication": {
      "status": "not_authenticated",
      "error": null,
      "details": {
        "hasSession": false,
        "user": null
      }
    }
  }
}
```

### 2. Debug Dashboard
**URL:** `/debug`
**Method:** GET
**Description:** Interactive web dashboard showing real-time system status with automatic refresh every 10 seconds.

**Features:**
- Visual status indicators (✅ ❌ ⚠️)
- Detailed component information
- Auto-refresh every 10 seconds
- Troubleshooting tips
- Color-coded status indicators

## Component Status Indicators

### Database Connection
- ✅ **Connected**: Database is accessible and queries work
- ❌ **Error**: Database file missing, corrupted, or permissions issue
- **Details shown**: Database path, user count, available tables

### Docker Connection
- ✅ **Connected**: Docker daemon is accessible and responding
- ❌ **Error**: Docker daemon not running or socket path incorrect
- **Details shown**: Container count, sample containers, socket path

### Authentication
- ✅ **Authenticated**: User is logged in with valid session
- ⚠️ **Not Authenticated**: No active session (normal for new visitors)
- ❌ **Error**: Session system malfunction
- **Details shown**: Session status, current user info

## Common Issues and Solutions

### 1. Database Issues
**Symptoms:** Database shows "error" status
**Solutions:**
- Check if `data/docklite.db` file exists
- Verify file permissions (should be writable by the app)
- Ensure the `data/` directory exists
- Check console logs for SQLite errors

### 2. Docker Issues
**Symptoms:** Docker shows "error" status
**Solutions:**
- Ensure Docker daemon is running: `sudo systemctl status docker`
- Check Docker socket permissions: `ls -la /var/run/docker.sock`
- Verify Docker is installed and accessible
- Check if the app has permission to access Docker

### 3. Authentication Issues
**Symptoms:** Can't access protected routes
**Solutions:**
- Try logging in with default credentials: admin/admin
- Check browser cookies are enabled
- Verify SESSION_SECRET environment variable
- Check session table in database

### 4. "Not Found" Dashboard Error
**Debugging Steps:**
1. Check the debug endpoint - if it's working, API routes are functional
2. Look at database status - ensure sites table is accessible
3. Check Docker status - containers should be listable
4. Check browser console for JavaScript errors
5. Verify the main dashboard API calls (`/api/sites` and `/api/containers`)

## Quick Health Check

Run this command to get a quick system overview:
```bash
curl -s http://localhost:3000/api/debug | jq '.status'
```

Expected output: `"healthy"`

If you get `"unhealthy"`, check the detailed debug information for specific component failures.

## Next Steps

If the debug tools show all components as healthy but you're still experiencing issues:

1. Check browser console for JavaScript errors
2. Monitor network requests in browser developer tools
3. Check server logs for any error messages
4. Verify all environment variables are set correctly
5. Ensure all dependencies are properly installed

The debug tools provide a foundation for identifying system-level issues. For application-specific problems, additional debugging may be needed in the React components and API routes.