import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { DocklitePathError, resolveDocklitePath } from '@/lib/path-helpers';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  try {
    const userSession = await requireAuth();
    if (!userSession.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = getUserById(userSession.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { path: targetPath } = await request.json();
    if (!targetPath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const { resolvedPath } = await resolveDocklitePath(targetPath, { mustExist: true });

    const stats = await fs.stat(resolvedPath).catch(() => null);
    if (!stats) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    await fs.rm(resolvedPath, { recursive: true, force: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof DocklitePathError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deleting path:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
