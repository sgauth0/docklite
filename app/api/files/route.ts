
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { DocklitePathError, ensureUserPathAccess, resolveDocklitePath } from '@/lib/path-helpers';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userSession = await requireAuth();
    const { searchParams } = new URL(request.url);
    const dir = searchParams.get('path') || '.';

    const { resolvedPath, baseDir } = await resolveDocklitePath(dir, { mustExist: true });

    // For non-admin users, restrict access to their own user directory only
    const user = getUserById(userSession.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    await ensureUserPathAccess(resolvedPath, baseDir, user.username, userSession.isAdmin);

    const files = await fs.readdir(resolvedPath, { withFileTypes: true });

    const fileList = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
    }));

    return NextResponse.json(fileList);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }
    if (error instanceof DocklitePathError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error reading directory:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
