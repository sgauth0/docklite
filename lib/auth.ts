import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { UserSession } from '@/types';

function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production.');
  }

  console.warn('⚠️ SESSION_SECRET is not set. Using a temporary dev-only secret.');
  return `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

// Session configuration
export const sessionOptions: SessionOptions = {
  password: getSessionPassword(),
  cookieName: 'docklite_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

// Extend IronSession type
export interface SessionData {
  user?: UserSession;
}

// Get session from cookies
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session.user;
}

// Get current user from session
export async function getCurrentUser(): Promise<UserSession | null> {
  const session = await getSession();
  if (!session.user) return null;

  const { getUserById } = await import('./db');
  const dbUser = getUserById(session.user.userId);
  if (!dbUser) return null;

  session.user.role = dbUser.role || (dbUser.is_admin ? 'admin' : 'user');
  session.user.isAdmin = dbUser.is_admin === 1;
  session.user.username = dbUser.username;

  return session.user;
}

// Require authentication (throws if not authenticated)
export async function requireAuth(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Require admin (throws if not admin)
export async function requireAdmin(): Promise<UserSession> {
  const user = await requireAuth();
  if (!user.isAdmin) {
    throw new Error('Forbidden: Admin access required');
  }
  return user;
}

// Check if user has specific role (new role-based auth)
export async function requireRole(allowedRoles: Array<'super_admin' | 'admin' | 'user'>): Promise<UserSession> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: Requires one of: ${allowedRoles.join(', ')}`);
  }
  return user;
}

// Require super admin only
export async function requireSuperAdmin(): Promise<UserSession> {
  return requireRole(['super_admin']);
}

// Check if user can manage another user (hierarchy check)
export async function canManageUser(managerId: number, targetUserId: number): Promise<boolean> {
  const { getUserById } = await import('./db');
  const manager = getUserById(managerId);
  const target = getUserById(targetUserId);

  if (!manager || !target) return false;

  // Super admin can manage anyone
  if (manager.is_super_admin === 1) return true;

  // Admin can manage regular users (not other admins)
  if (manager.role === 'admin' && target.role === 'user') return true;

  // Admin can manage users they created
  if (manager.role === 'admin' && target.managed_by === managerId) return true;

  return false;
}
