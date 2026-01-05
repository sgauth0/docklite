
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { DocklitePathError, ensureUserPathAccess, resolveDocklitePath } from '@/lib/path-helpers';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export async function POST(request: Request) {
  try {
    const userSession = await requireAuth();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadPath = formData.get('path') as string;

    if (!file || !uploadPath) {
      return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
    }

    const user = getUserById(userSession.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { resolvedPath, baseDir } = await resolveDocklitePath(uploadPath, { mustExist: true });
    await ensureUserPathAccess(resolvedPath, baseDir, user.username, userSession.isAdmin);

    const originalName = file.name || 'upload';
    let extension = path.extname(originalName);
    if (extension && !/^\.[a-zA-Z0-9.]+$/.test(extension)) {
      extension = '';
    }
    const safeName = `${crypto.randomUUID()}${extension}`;
    const filePath = path.join(resolvedPath, safeName);
    const fileStream = file.stream();
    const writeStream = await fs.open(filePath, 'w');
    await pipeline(Readable.fromWeb(fileStream as any), writeStream.createWriteStream());

    return NextResponse.json({ success: true, fileName: safeName, originalName });
  } catch (error: any) {
    if (error instanceof DocklitePathError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
