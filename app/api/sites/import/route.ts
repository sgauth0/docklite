import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createSite, getSiteByContainerId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { containerId, domain, type, codePath } = await request.json();

    // Check if already imported
    const existing = getSiteByContainerId(containerId);
    if (existing) {
      return NextResponse.json(
        { error: 'Site already imported' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!containerId || !domain || !type || !codePath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create site entry
    const site = createSite({
      domain,
      container_id: containerId,
      user_id: user.isAdmin ? 1 : user.userId, // Assign to admin or current user
      template_type: type,
      code_path: codePath,
    });

    return NextResponse.json({ site }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error importing site:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import site' },
      { status: 500 }
    );
  }
}
