import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listContainers } from '@/lib/docker';
import { getFoldersByUser, getContainersByFolder } from '@/lib/db';
import { ContainerInfo, Folder } from '@/types';

export const dynamic = 'force-dynamic';

export interface FolderWithContainers {
  folder: Folder;
  containers: ContainerInfo[];
}

export async function GET() {
  try {
    const user = await requireAuth();

    // Get user's folders
    const folders = getFoldersByUser(user.userId);

    // Get all DockLite-managed containers
    const allContainers = await listContainers(true); // true = only managed containers

    // Build folder structure with containers
    const foldersWithContainers: FolderWithContainers[] = [];
    const assignedContainerIds = new Set<string>();

    for (const folder of folders) {
      // Get container IDs assigned to this folder
      const folderContainerIds = getContainersByFolder(folder.id);

      // Find the actual container objects
      const folderContainers = allContainers.filter(c =>
        folderContainerIds.includes(c.id)
      );

      // Track which containers are assigned
      folderContainers.forEach(c => assignedContainerIds.add(c.id));

      foldersWithContainers.push({
        folder,
        containers: folderContainers,
      });
    }

    // Find unassigned containers (containers not in any folder)
    const unassignedContainers = allContainers.filter(c =>
      !assignedContainerIds.has(c.id)
    );

    // Add unassigned containers to Default folder if it exists
    const defaultFolder = foldersWithContainers.find(f => f.folder.name === 'Default');
    if (defaultFolder && unassignedContainers.length > 0) {
      // Add unassigned containers to Default folder display
      defaultFolder.containers.push(...unassignedContainers);
    }

    return NextResponse.json({
      folders: foldersWithContainers,
      totalContainers: allContainers.length,
    });

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error listing containers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
