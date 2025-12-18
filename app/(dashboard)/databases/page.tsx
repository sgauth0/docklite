'use client';

import { useEffect, useState } from 'react';
import { Database as DatabaseType } from '@/types';

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<DatabaseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [creating, setCreating] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);

  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/databases');
      if (!res.ok) throw new Error('Failed to fetch databases');

      const data = await res.json();
      setDatabases(data.databases);
      setLoading(false);
    } catch (err) {
      setError('Failed to load databases');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDbName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create database');
      }

      const data = await res.json();
      setConnectionInfo(data.connection);
      setNewDbName('');
      setShowCreateForm(false);
      fetchDatabases();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-2xl font-bold neon-text" style={{ color: 'var(--neon-cyan)' }}>
          ⟳ Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold neon-text" style={{ color: 'var(--neon-purple)' }}>
          💾 Databases
        </h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="mt-4 sm:mt-0 btn-neon"
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
            className="mt-4 px-4 py-2 rounded-lg font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--neon-green) 0%, var(--neon-cyan) 100%)',
              color: 'var(--bg-darker)',
              boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)'
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

            <button
              type="submit"
              disabled={creating}
              className="btn-neon w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? '⟳ Creating...' : '✨ Create Database'}
            </button>
          </form>
        </div>
      )}

      {databases.length === 0 ? (
        <div className="mt-8 text-center py-12 card-vapor">
          <p className="text-lg font-bold mb-2" style={{ color: 'var(--neon-pink)' }}>
            📭 No databases yet!
          </p>
          <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            Create your first database to get started ✨
          </p>
        </div>
      ) : (
        <div className="mt-8 card-vapor overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2" style={{ borderColor: 'rgba(255, 16, 240, 0.3)' }}>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neon-cyan)' }}>
                    💾 Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neon-purple)' }}>
                    🔌 Port
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neon-pink)' }}>
                    📦 Container ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neon-green)' }}>
                    📅 Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {databases.map((db) => (
                  <tr
                    key={db.id}
                    className="border-b transition-colors hover:bg-purple-900/20"
                    style={{ borderColor: 'rgba(0, 255, 255, 0.1)' }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-bold" style={{ color: 'var(--neon-cyan)' }}>
                      {db.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                      {db.postgres_port}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {db.container_id.substring(0, 12)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono" style={{ color: 'var(--neon-green)' }}>
                      {new Date(db.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 card-vapor p-6 rounded-xl border-2" style={{ borderColor: 'rgba(0, 255, 255, 0.3)' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--neon-cyan)' }}>
              🔗 CONNECTION INFO
            </p>
            <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              Connect to your databases using <span className="font-bold" style={{ color: 'var(--neon-pink)' }}>localhost</span> as the host and the port shown above.
              Default username is <span className="font-bold" style={{ color: 'var(--neon-pink)' }}>docklite</span>. Password is generated randomly during creation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
