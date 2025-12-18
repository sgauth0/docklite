import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listContainers } from '@/lib/docker';
import { getSitesByUser } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireAuth();

    // Get all containers
    const allContainers = await listContainers(true);

    // If admin, return all containers
    if (user.isAdmin) {
      return NextResponse.json({ containers: allContainers });
    }

    // For regular users, filter to only their sites
    const userSites = getSitesByUser(user.userId, false);
    const userContainerIds = new Set(userSites.map(site => site.container_id));

    const userContainers = allContainers.filter(container =>
      userContainerIds.has(container.id)
    );

    return NextResponse.json({ containers: userContainers });
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
