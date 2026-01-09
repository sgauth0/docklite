
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { DocklitePathError, ensureUserPathAccess, resolveDocklitePath } from '@/lib/path-helpers';
import fs from 'fs/promises';

export async function GET(request: Request) {
  try {
    const userSession = await requireAuth();
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Get user info for permission check
    const user = getUserById(userSession.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { resolvedPath, baseDir } = await resolveDocklitePath(filePath, { mustExist: true });
    await ensureUserPathAccess(resolvedPath, baseDir, user.username, userSession.isAdmin);

    const content = await fs.readFile(resolvedPath, 'utf-8');

    return NextResponse.json({ content });
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
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userSession = await requireAuth();
    const { filePath, content } = await request.json();

    if (!filePath || content === undefined) {
      return NextResponse.json({ error: 'File path and content are required' }, { status: 400 });
    }

    // Get user info for permission check
    const user = getUserById(userSession.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { resolvedPath, baseDir } = await resolveDocklitePath(filePath, { mustExist: false });
    await ensureUserPathAccess(resolvedPath, baseDir, user.username, userSession.isAdmin);

    await fs.writeFile(resolvedPath, content, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof DocklitePathError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error writing file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
