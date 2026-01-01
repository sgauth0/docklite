import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listContainers } from '@/lib/docker';
import { getFoldersByUser, getContainersByFolder } from '@/lib/db';
import { ContainerInfo, FolderNode } from '@/types';
import { buildFolderTree } from '@/lib/folder-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();

    // Get user's folders
    const folders = getFoldersByUser(user.userId);

    // Get all DockLite-managed containers
    const allContainers = await listContainers(true); // true = only managed containers

    // Build map of containers by folder ID
    const containersByFolderId = new Map<number, ContainerInfo[]>();
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

      containersByFolderId.set(folder.id, folderContainers);
    }

    // Find unassigned containers (containers not in any folder)
    const unassignedContainers = allContainers.filter(c =>
      !assignedContainerIds.has(c.id)
    );

    // Add unassigned containers to Default folder if it exists
    const defaultFolder = folders.find(f => f.name === 'Default');
    if (defaultFolder && unassignedContainers.length > 0) {
      const existing = containersByFolderId.get(defaultFolder.id) || [];
      containersByFolderId.set(defaultFolder.id, [...existing, ...unassignedContainers]);
    }

    // Build hierarchical folder tree
    const folderTree = buildFolderTree(folders, containersByFolderId);

    return NextResponse.json({
      folders: folderTree,
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
