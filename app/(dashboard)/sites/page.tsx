'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Site, ContainerInfo } from '@/types';

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [sitesRes, containersRes] = await Promise.all([
        fetch('/api/sites'),
        fetch('/api/containers'),
      ]);

      if (!sitesRes.ok || !containersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const sitesData = await sitesRes.json();
      const containersData = await containersRes.json();

      setSites(sitesData.sites);
      setContainers(containersData.containers);
      setLoading(false);
    } catch (err) {
      setError('Failed to load sites');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getContainerInfo = (containerId: string) => {
    return containers.find(c => c.id === containerId);
  };

  const handleAction = async (containerId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const res = await fetch(`/api/containers/${containerId}/${action}`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(`Failed to ${action} container`);
      }

      fetchData();
    } catch (err) {
      alert(`Error: ${err}`);
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

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-xl font-bold" style={{ color: '#ff6b6b' }}>
          ❌ {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold neon-text" style={{ color: 'var(--neon-pink)' }}>
            🌸 DockLite Sites
          </h1>
          <p className="mt-1 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            ▸ Sites managed through DockLite ◂
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <Link
            href="/sites/import"
            className="px-4 py-2 rounded-lg font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-cyan) 100%)',
              color: 'var(--bg-darker)',
              boxShadow: '0 0 10px rgba(181, 55, 242, 0.5)'
            }}
          >
            📥 Import Existing
          </Link>
          <Link
            href="/sites/new"
            className="btn-neon"
          >
            ✨ Create Site
          </Link>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="mt-8 text-center py-12 card-vapor">
          <p className="text-lg font-bold mb-2" style={{ color: 'var(--neon-pink)' }}>
            📭 No DockLite sites yet!
          </p>
          <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            Create your first site to get started ✨
          </p>
        </div>
      ) : (
        <div className="mt-8 card-vapor overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2" style={{ borderColor: 'rgba(255, 16, 240, 0.3)' }}>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neon-cyan)' }}>
                    🌐 Domain
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neon-purple)' }}>
                    📋 Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neon-pink)' }}>
                    ⚡ Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neon-green)' }}>
                    ⏱️ Uptime
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neon-yellow)' }}>
                    📁 Code Path
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--neon-pink)' }}>
                    🎮 Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => {
                  const containerInfo = getContainerInfo(site.container_id);
                  const isRunning = containerInfo?.state === 'running';

                  return (
                    <tr
                      key={site.id}
                      className="border-b transition-colors hover:bg-purple-900/20"
                      style={{ borderColor: 'rgba(0, 255, 255, 0.1)' }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/sites/${site.id}`}
                          className="font-bold neon-text hover:text-pink-300 transition-colors"
                          style={{ color: 'var(--neon-cyan)' }}
                        >
                          {site.domain}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-bold rounded-full" style={{
                          background: 'linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-pink) 100%)',
                          color: 'white'
                        }}>
                          {site.template_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={isRunning ? 'badge-running' : 'badge-stopped'}>
                          {isRunning ? '● ONLINE' : '○ OFFLINE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono" style={{ color: 'var(--neon-green)' }}>
                        {containerInfo?.uptime || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {site.code_path}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                        {!isRunning ? (
                          <button
                            onClick={() => handleAction(site.container_id, 'start')}
                            className="px-3 py-1 rounded-lg transition-all"
                            style={{
                              background: 'linear-gradient(135deg, var(--neon-green) 0%, var(--neon-cyan) 100%)',
                              color: 'var(--bg-darker)',
                              boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)'
                            }}
                          >
                            ▶ Start
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAction(site.container_id, 'restart')}
                              className="px-3 py-1 rounded-lg transition-all"
                              style={{
                                background: 'linear-gradient(135deg, var(--neon-yellow) 0%, var(--neon-pink) 100%)',
                                color: 'var(--bg-darker)',
                                boxShadow: '0 0 10px rgba(255, 255, 0, 0.5)'
                              }}
                            >
                              ⟳ Restart
                            </button>
                            <button
                              onClick={() => handleAction(site.container_id, 'stop')}
                              className="px-3 py-1 rounded-lg transition-all"
                              style={{
                                background: 'linear-gradient(135deg, #ff6b6b 0%, var(--neon-pink) 100%)',
                                color: 'white',
                                boxShadow: '0 0 10px rgba(255, 107, 107, 0.5)'
                              }}
                            >
                              ■ Stop
                            </button>
                          </>
                        )}
                        <Link
                          href={`/sites/${site.id}`}
                          className="px-3 py-1 rounded-lg transition-all inline-block"
                          style={{
                            background: 'linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-pink) 100%)',
                            color: 'white',
                            boxShadow: '0 0 10px rgba(181, 55, 242, 0.5)'
                          }}
                        >
                          👁️ Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
