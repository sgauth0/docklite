import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById, getSitesByUser } from '@/lib/db';
import { listContainers } from '@/lib/docker';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

interface SiteFolder {
  domain: string;
  hasContainer: boolean;
  containerRunning: boolean;
  containerId?: string;
  siteId?: number;
  path: string;
}

export async function GET() {
  try {
    const userSession = await requireAuth();
    const user = getUserById(userSession.userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get database sites
    const dbSites = getSitesByUser(userSession.userId, userSession.isAdmin);

    // Get all containers
    const containers = await listContainers(true);

    // Determine which directory to scan
    const basePath = userSession.isAdmin
      ? '/var/www/sites'
      : `/var/www/sites/${user.username}`;

    const folders: SiteFolder[] = [];

    try {
      // Read directories from filesystem
      const entries = await fs.readdir(basePath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // For admin, we need to go one level deeper to get actual site folders
        if (userSession.isAdmin) {
          const userPath = path.join(basePath, entry.name);
          const siteDirs = await fs.readdir(userPath, { withFileTypes: true });

          for (const siteDir of siteDirs) {
            if (!siteDir.isDirectory()) continue;

            const domain = siteDir.name;
            const fullPath = path.join(userPath, domain);

            // Check if this folder has a site in DB
            const dbSite = dbSites.find(s => s.domain === domain);

            // Check if there's a running container
            const container = dbSite
              ? containers.find(c => c.id === dbSite.container_id)
              : null;

            folders.push({
              domain,
              hasContainer: !!container,
              containerRunning: container?.state === 'running',
              containerId: container?.id,
              siteId: dbSite?.id,
              path: fullPath,
            });
          }
        } else {
          // For regular users, entry.name is the domain
          const domain = entry.name;
          const fullPath = path.join(basePath, domain);

          // Check if this folder has a site in DB
          const dbSite = dbSites.find(s => s.domain === domain);

          // Check if there's a running container
          const container = dbSite
            ? containers.find(c => c.id === dbSite.container_id)
            : null;

          folders.push({
            domain,
            hasContainer: !!container,
            containerRunning: container?.state === 'running',
            containerId: container?.id,
            siteId: dbSite?.id,
            path: fullPath,
          });
        }
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // Directory doesn't exist yet, return empty array
        return NextResponse.json({ folders: [] });
      }
      throw err;
    }

    // Sort: containers first, then alphabetically
    folders.sort((a, b) => {
      if (a.hasContainer && !b.hasContainer) return -1;
      if (!a.hasContainer && b.hasContainer) return 1;
      return a.domain.localeCompare(b.domain);
    });

    return NextResponse.json({ folders });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error listing site folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
