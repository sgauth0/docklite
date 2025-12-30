import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { UserSession } from '@/types';

// Session configuration
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_security',
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

  // Handle old sessions without role field - populate from database but don't save
  // (session will be updated on next login)
  if (!session.user.role) {
    const { getUserById } = await import('./db');
    const dbUser = getUserById(session.user.userId);
    if (dbUser) {
      // Populate the role for this request, but don't persist to cookie
      // The session will be updated on next login with the role
      session.user.role = dbUser.role || (dbUser.is_admin ? 'admin' : 'user');
    }
  }

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
