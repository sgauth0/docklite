'use client';

import { useEffect, useState } from 'react';
import { Database as DatabaseType } from '@/types';
import DbViewer from './DbViewer';
import SkeletonLoader from '../components/SkeletonLoader';

interface DatabaseWithSize extends DatabaseType {
  size: number;
  sizeCategory: 'empty' | 'tiny' | 'small' | 'medium' | 'large' | 'huge';
}

interface DockliteDbInfo {
  size: number;
  tables: number;
  path: string;
}

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<DatabaseWithSize[]>([]);
  const [dockliteDb, setDockliteDb] = useState<DockliteDbInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [newDbUsername, setNewDbUsername] = useState('docklite');
  const [newDbPassword, setNewDbPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [editingDb, setEditingDb] = useState<DatabaseWithSize | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/databases/stats');
      if (!res.ok) throw new Error('Failed to fetch databases');

      const data = await res.json();
      setDatabases(data.databases);
      setDockliteDb(data.dockliteDb);
      setLoading(false);
    } catch (err) {
      setError('Failed to load databases');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
    const interval = setInterval(fetchDatabases, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDbName,
          username: newDbUsername,
          password: newDbPassword || undefined, // Let backend generate if empty
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create database');
      }

      const data = await res.json();
      setConnectionInfo(data.connection);
      setNewDbName('');
      setNewDbUsername('docklite');
      setNewDbPassword('');
      setShowCreateForm(false);
      fetchDatabases();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDb) return;

    setCreating(true);
    setError('');

    try {
      const res = await fetch(`/api/databases/${editingDb.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editUsername,
          password: editPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update database');
      }

      setEditingDb(null);
      setEditUsername('');
      setEditPassword('');
      fetchDatabases();
      alert('✓ Database credentials updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (db: DatabaseWithSize) => {
    setEditingDb(db);
    setEditUsername('docklite');
    setEditPassword('');
    setError('');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getSizeEmojis = (category: string) => {
    const emojiMap = {
      empty: '',
      tiny: '💾',
      small: '💾💾',
      medium: '💾💾💾',
      large: '💾💾💾💾',
      huge: '💾💾💾💾💾',
    };
    return emojiMap[category as keyof typeof emojiMap] || '';
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold neon-text mb-2" style={{ color: 'var(--neon-purple)' }}>
            💾 Databases
          </h1>
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            ▶ LOADING... ◀
          </p>
        </div>
        <SkeletonLoader type="database" count={4} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <DbViewer />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold neon-text mb-2" style={{ color: 'var(--neon-purple)' }}>
            💾 Databases
          </h1>
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            ▶ DATABASE MANAGEMENT SYSTEM ◀
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-neon inline-flex items-center gap-2"
        >
          {showCreateForm ? '✕ Cancel' : '✨ Create Database'}
        </button>
      </div>

      {error && (
        <div className="mt-4 card-vapor p-4 rounded-lg border-2" style={{ borderColor: 'rgba(255, 107, 107, 0.5)' }}>
          <p className="font-bold" style={{ color: '#ff6b6b' }}>
            ❌ {error}
          </p>
        </div>
      )}

      {connectionInfo && (
        <div className="mt-4 card-vapor p-6 rounded-lg border-2" style={{ borderColor: 'rgba(57, 255, 20, 0.5)' }}>
          <h3 className="text-lg font-bold mb-3 neon-text" style={{ color: 'var(--neon-green)' }}>
            ✓ Database Created Successfully!
          </h3>
          <div className="space-y-2 font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--neon-cyan)' }}>🌐 HOST:</span>
              <span>{connectionInfo.host}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--neon-cyan)' }}>🔌 PORT:</span>
              <span>{connectionInfo.port}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--neon-cyan)' }}>💾 DATABASE:</span>
              <span>{connectionInfo.database}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--neon-cyan)' }}>👤 USERNAME:</span>
              <span>{connectionInfo.username}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--neon-cyan)' }}>🔑 PASSWORD:</span>
              <span className="font-bold" style={{ color: 'var(--neon-pink)' }}>{connectionInfo.password}</span>
            </div>
          </div>
          <p className="mt-4 text-xs font-mono" style={{ color: 'var(--neon-yellow)' }}>
            ⚠️ Save these credentials - the password will not be shown again!
          </p>
          <button
            onClick={() => setConnectionInfo(null)}
            className="mt-4 px-3 py-1.5 text-sm rounded-lg font-bold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--neon-green) 0%, var(--neon-cyan) 100%)',
              color: 'var(--bg-darker)',
            }}
          >
            👍 Got it!
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className="mt-6 card-vapor p-6 rounded-xl">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-bold mb-2" style={{ color: 'var(--neon-cyan)' }}>
                💾 DATABASE NAME
              </label>
              <input
                type="text"
                id="name"
                required
                value={newDbName}
                onChange={(e) => setNewDbName(e.target.value)}
                className="input-vapor w-full"
                placeholder="my_awesome_database"
              />
              <p className="mt-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                ▸ Only alphanumeric characters and underscores ◂
              </p>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-bold mb-2" style={{ color: 'var(--neon-purple)' }}>
                👤 USERNAME
              </label>
              <input
                type="text"
                id="username"
                required
                value={newDbUsername}
                onChange={(e) => setNewDbUsername(e.target.value)}
                className="input-vapor w-full"
                placeholder="docklite"
              />
              <p className="mt-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                ▸ Default: docklite ◂
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold mb-2" style={{ color: 'var(--neon-pink)' }}>
                🔑 PASSWORD
              </label>
              <input
                type="password"
                id="password"
                value={newDbPassword}
                onChange={(e) => setNewDbPassword(e.target.value)}
                className="input-vapor w-full"
                placeholder="Leave empty for auto-generated password"
              />
              <p className="mt-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                ▸ Leave empty to auto-generate a secure password ◂
              </p>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="btn-neon w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? '⟳ Creating...' : '✨ Create PostgreSQL Database'}
            </button>
          </form>
        </div>
      )}

      {/* PostgreSQL Databases */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold neon-text mb-4" style={{ color: 'var(--neon-pink)' }}>
          🐘 PostgreSQL Databases
        </h2>

        {databases.length === 0 ? (
          <div className="text-center py-12 card-vapor">
            <p className="text-lg font-bold mb-2" style={{ color: 'var(--neon-pink)' }}>
              📭 No PostgreSQL databases yet!
            </p>
            <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              Create your first database to get started ✨
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {databases.map((db) => (
              <div
                key={db.id}
                className="card-vapor p-6 rounded-xl border border-purple-500/20 transition-all hover:scale-[1.02] hover:border-purple-500/50"
              >
                {/* Header with size emojis */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold neon-text truncate" style={{ color: 'var(--neon-cyan)' }}>
                    {db.name}
                  </h3>
                  <div className="text-2xl flex-shrink-0 ml-2">
                    {getSizeEmojis(db.sizeCategory) || '📦'}
                  </div>
                </div>

                {/* Size badge */}
                <div className="mb-4">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: db.size === 0
                        ? 'rgba(100, 100, 100, 0.2)'
                        : 'rgba(57, 255, 20, 0.2)',
                      color: db.size === 0 ? '#999' : 'var(--neon-green)',
                      border: `1px solid ${db.size === 0 ? '#666' : 'var(--neon-green)'}`,
                    }}
                  >
                    {db.size === 0 ? '○ EMPTY' : `● ${formatBytes(db.size)}`}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex items-center gap-2">
                    <span className="opacity-60" style={{ color: 'var(--text-secondary)' }}>🔌 Port:</span>
                    <span className="font-bold" style={{ color: 'var(--neon-purple)' }}>
                      {db.postgres_port}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-60" style={{ color: 'var(--text-secondary)' }}>🆔 ID:</span>
                    <span className="opacity-70 text-xs">
                      {db.container_id.substring(0, 12)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-60" style={{ color: 'var(--text-secondary)' }}>📅 Created:</span>
                    <span className="opacity-70 text-xs">
                      {new Date(db.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Connection hint */}
                <div className="mt-4 pt-4 border-t border-purple-500/20">
                  <p className="text-xs font-mono opacity-60 mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Connect: localhost:{db.postgres_port}
                  </p>
                  <button
                    onClick={() => openEditModal(db)}
                    className="w-full px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)',
                      color: 'white',
                    }}
                  >
                    ✏️ Edit Credentials
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 card-vapor p-6 rounded-xl border-2" style={{ borderColor: 'rgba(0, 255, 255, 0.3)' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--neon-cyan)' }}>
              🔗 CONNECTION INFO
            </p>
            <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              Connect to your PostgreSQL databases using <span className="font-bold" style={{ color: 'var(--neon-pink)' }}>localhost</span> as the host and the port shown on each card.
              Default username is <span className="font-bold" style={{ color: 'var(--neon-pink)' }}>docklite</span>. Password is generated randomly during creation.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Database Modal */}
      {editingDb && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-vapor max-w-lg w-full p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold neon-text mb-2" style={{ color: 'var(--neon-cyan)' }}>
                ✏️ Edit Database Credentials
              </h2>
              <p className="text-sm font-mono opacity-70" style={{ color: 'var(--text-secondary)' }}>
                {editingDb.name}
              </p>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label htmlFor="edit-username" className="block text-sm font-bold mb-2" style={{ color: 'var(--neon-purple)' }}>
                  👤 NEW USERNAME
                </label>
                <input
                  type="text"
                  id="edit-username"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="input-vapor w-full"
                  placeholder="docklite"
                />
              </div>

              <div>
                <label htmlFor="edit-password" className="block text-sm font-bold mb-2" style={{ color: 'var(--neon-pink)' }}>
                  🔑 NEW PASSWORD
                </label>
                <input
                  type="password"
                  id="edit-password"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="input-vapor w-full"
                  placeholder="Enter new password"
                />
              </div>

              <div className="p-4 rounded-lg" style={{ background: 'rgba(255, 165, 0, 0.1)', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--neon-yellow)' }}>
                  ⚠️ This will update the PostgreSQL user credentials in the database container.
                  Make sure to update your application connection strings!
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDb(null);
                    setEditUsername('');
                    setEditPassword('');
                  }}
                  className="flex-1 px-4 py-3 rounded-lg font-bold transition-all hover:scale-105"
                  style={{
                    background: 'rgba(100, 100, 100, 0.3)',
                    border: '2px solid var(--text-secondary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  ✕ Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-3 rounded-lg font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)',
                    color: 'white',
                  }}
                >
                  {creating ? '⟳ Updating...' : '✓ Update Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
