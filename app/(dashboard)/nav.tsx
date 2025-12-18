'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { UserSession } from '@/types';

export default function DashboardNav({ user }: { user: UserSession }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="card-vapor border-b-2 border-pink-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-2xl font-bold neon-text" style={{ color: 'var(--neon-cyan)' }}>
                ⚡ DockLite ✨
              </h1>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
              <Link
                href="/server"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  isActive('/server')
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-gray-900 neon-glow'
                    : 'text-cyan-300 hover:text-cyan-100 hover:bg-purple-900/30'
                }`}
              >
                🖥️ Server
              </Link>
              <Link
                href="/"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  isActive('/')
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-gray-900 neon-glow'
                    : 'text-cyan-300 hover:text-cyan-100 hover:bg-purple-900/30'
                }`}
              >
                📦 Containers
              </Link>
              <Link
                href="/sites"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  isActive('/sites')
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-gray-900 neon-glow'
                    : 'text-cyan-300 hover:text-cyan-100 hover:bg-purple-900/30'
                }`}
              >
                🌸 Sites
              </Link>
              <Link
                href="/databases"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  isActive('/databases')
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-gray-900 neon-glow'
                    : 'text-cyan-300 hover:text-cyan-100 hover:bg-purple-900/30'
                }`}
              >
                💾 Databases
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="flex items-center text-sm font-bold text-pink-300 hover:text-pink-100 transition-colors">
                <span className="neon-text" style={{ color: 'var(--neon-pink)' }}>
                  ✨ {user.username}
                </span>
                {user.isAdmin && (
                  <span className="ml-2 px-2 py-1 text-xs font-bold rounded-full" style={{
                    background: 'linear-gradient(135deg, var(--neon-yellow) 0%, var(--neon-pink) 100%)',
                    color: 'var(--bg-darker)',
                    textShadow: 'none'
                  }}>
                    👑 ADMIN
                  </span>
                )}
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="hidden group-hover:block absolute right-0 mt-2 w-56 card-vapor neon-border rounded-lg overflow-hidden z-50">
                <div className="py-1">
                  <Link
                    href="/settings/password"
                    className="block px-4 py-3 text-sm font-bold text-cyan-300 hover:bg-purple-900/50 hover:text-cyan-100 transition-colors"
                  >
                    🔐 Change Password
                  </Link>
                  {user.isAdmin && (
                    <>
                      <Link
                        href="/settings/users"
                        className="block px-4 py-3 text-sm font-bold text-cyan-300 hover:bg-purple-900/50 hover:text-cyan-100 transition-colors"
                      >
                        👥 Manage Users
                      </Link>
                      <Link
                        href="/settings/users/new"
                        className="block px-4 py-3 text-sm font-bold text-cyan-300 hover:bg-purple-900/50 hover:text-cyan-100 transition-colors"
                      >
                        ➕ Create User
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-bold rounded-lg transition-all"
              style={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, var(--neon-pink) 100%)',
                color: 'white',
                boxShadow: '0 0 10px rgba(255, 16, 240, 0.5)'
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
