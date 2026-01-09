
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { DocklitePathError, ensureUserPathAccess, resolveDocklitePath } from '@/lib/path-helpers';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userSession = await requireAuth();
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    const user = getUserById(userSession.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { resolvedPath, baseDir } = await resolveDocklitePath(filePath, { mustExist: true });
    await ensureUserPathAccess(resolvedPath, baseDir, user.username, userSession.isAdmin);

    const stat = await fs.promises.stat(resolvedPath);
    const stream = fs.createReadStream(resolvedPath);

    return new NextResponse(stream as any, {
      headers: {
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size.toString(),
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    if (error instanceof DocklitePathError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
