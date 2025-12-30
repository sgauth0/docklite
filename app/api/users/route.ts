import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { createUser } from '@/lib/db';
import { ensureUserFolder } from '@/lib/user-helpers';

export const dynamic = 'force-dynamic';

// Get all users (admin only)
export async function GET() {
  try {
    const user = await requireAdmin();

    const db = require('@/lib/db').default;
    const users = db.prepare('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC').all();

    return NextResponse.json({ users });
  } catch (error: any) {
    if (error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error listing users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAdmin();
    const { username, password, isAdmin } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create user
    const newUser = createUser(username, password, isAdmin || false);

    // Create user's home folder in /var/www/sites/{username}
    try {
      const userPath = await ensureUserFolder(username);
      console.log(`✓ Created folder for user ${username}: ${userPath}`);
    } catch (folderError) {
      console.error(`⚠️ Failed to create folder for user ${username}:`, folderError);
      // Don't fail user creation if folder creation fails - we can fix it later
    }

    return NextResponse.json({
      user: {
        id: newUser.id,
        username: newUser.username,
        isAdmin: newUser.is_admin === 1,
      }
    }, { status: 201 });
  } catch (error: any) {
    if (error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
