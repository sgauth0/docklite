import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listContainers } from '@/lib/docker';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();

    // List ALL containers (not just DockLite-managed ones)
    const containers = await listContainers(false);

    return NextResponse.json({ containers });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error listing all containers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
