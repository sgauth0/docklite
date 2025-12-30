import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSiteById, deleteSite, getUserById } from '@/lib/db';
import { removeContainer } from '@/lib/docker';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const siteId = parseInt(id, 10);
    if (isNaN(siteId)) {
      return NextResponse.json(
        { error: 'Invalid site ID' },
        { status: 400 }
      );
    }

    const site = getSiteById(siteId, user.userId, user.isAdmin);
    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    const siteUser = getUserById(site.user_id);

    return NextResponse.json({ site: { ...site, username: siteUser?.username } });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error getting site:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const siteId = parseInt(id, 10);
    if (isNaN(siteId)) {
      return NextResponse.json(
        { error: 'Invalid site ID' },
        { status: 400 }
      );
    }

    const site = getSiteById(siteId, user.userId, user.isAdmin);
    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Remove container
    if (site.container_id) {
      try {
        await removeContainer(site.container_id, true);
      } catch (error) {
        console.error('Error removing container:', error);
        // Continue even if container removal fails
      }
    }

    // Delete from database
    deleteSite(siteId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting site:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
