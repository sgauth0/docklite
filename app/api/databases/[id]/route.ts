import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDatabaseById, deleteDatabase, hasAccess } from '@/lib/db';
import { removeContainer } from '@/lib/docker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const databaseId = parseInt(id, 10);
    if (isNaN(databaseId)) {
      return NextResponse.json(
        { error: 'Invalid database ID' },
        { status: 400 }
      );
    }

    const database = getDatabaseById(databaseId);
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    // Check access
    if (!hasAccess(user.userId, databaseId, user.isAdmin)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ database });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error getting database:', error);
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

    // Only admin can delete databases
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const databaseId = parseInt(id, 10);
    if (isNaN(databaseId)) {
      return NextResponse.json(
        { error: 'Invalid database ID' },
        { status: 400 }
      );
    }

    const database = getDatabaseById(databaseId);
    if (!database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    // Remove container
    try {
      await removeContainer(database.container_id, true);
    } catch (error) {
      console.error('Error removing database container:', error);
      // Continue even if container removal fails
    }

    // Delete from database (will also delete permissions)
    deleteDatabase(databaseId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting database:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
