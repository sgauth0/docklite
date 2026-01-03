import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUser, verifyPassword } from '@/lib/db';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function getClientKey(request: NextRequest, username: string): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  return `${ip}:${username}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return false;

  if (now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }

  return entry.count >= MAX_ATTEMPTS;
}

function recordAttempt(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return;
  }
  entry.count += 1;
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key);
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const rateLimitKey = getClientKey(request, username);
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Get user from database
    const user = getUser(username);
    if (!user) {
      recordAttempt(rateLimitKey);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    if (!verifyPassword(user, password)) {
      recordAttempt(rateLimitKey);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create session
    const session = await getSession();
    session.user = {
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin === 1,
      role: user.role || (user.is_admin === 1 ? 'admin' : 'user'), // Fallback for migrated data
    };
    await session.save();
    clearAttempts(rateLimitKey);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
