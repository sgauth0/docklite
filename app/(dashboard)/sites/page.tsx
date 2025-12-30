'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SslStatus from '../components/SslStatus';
import SkeletonLoader from '../components/SkeletonLoader';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '@/lib/hooks/useToast';

interface SiteFolder {
  domain: string;
  hasContainer: boolean;
  containerRunning: boolean;
  containerId?: string;
  siteId?: number;
  path: string;
}

export default function SitesPage() {
  const [folders, setFolders] = useState<SiteFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<{ domain: string; path: string } | null>(null);
  const toast = useToast();

  const fetchData = async () => {
    try {
      const res = await fetch('/api/sites/folders');
      if (!res.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await res.json();
      setFolders(data.folders);
    } catch (err) {
      setError('Failed to load sites and folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (containerId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const res = await fetch(`/api/containers/${containerId}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Failed to ${action} container`);
      toast.success(`Container ${action}ed successfully!`);
      fetchData();
    } catch (err: any) {
      toast.error(`Error: ${err.message || err}`);
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      const res = await fetch('/api/files/folder', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderToDelete.path }),
      });
      if (!res.ok) throw new Error('Failed to delete folder');
      toast.success(`Folder "${folderToDelete.domain}" deleted successfully!`);
      setFolderToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(`Error: ${err.message || err}`);
      setFolderToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold neon-text" style={{ color: 'var(--neon-pink)' }}>
            🌸 Sites & Folders
          </h1>
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            ▶ LOADING... ◀
          </p>
        </div>
        <SkeletonLoader type="list" count={5} />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl lg:text-4xl font-bold neon-text" style={{ color: 'var(--neon-pink)' }}>
          🌸 Sites & Folders
        </h1>
        <Link href="/sites/new" className="btn-neon inline-flex items-center gap-2">
          ✨ Create Site
        </Link>
      </div>

      {folders.length === 0 ? (
        <div className="mt-12 text-center card-vapor py-16">
          <p className="text-xl font-bold neon-text mb-4" style={{ color: 'var(--neon-cyan)' }}>
            No sites or folders found
          </p>
          <Link href="/sites/new" className="btn-neon inline-flex items-center gap-2">
            ✨ Create Your First Site
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {folders.map(folder => (
            <div
              key={folder.domain}
              className="card-vapor p-6 rounded-xl border border-purple-500/20"
              style={{
                background: folder.hasContainer
                  ? 'linear-gradient(135deg, rgba(26, 10, 46, 0.95) 0%, rgba(10, 5, 16, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(46, 26, 10, 0.7) 0%, rgba(16, 10, 5, 0.7) 100%)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold neon-text" style={{ color: folder.hasContainer ? 'var(--neon-cyan)' : '#ffa500' }}>
                    {folder.hasContainer ? '📦' : '📁'} {folder.domain}
                  </h2>
                  {folder.hasContainer ? (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: folder.containerRunning ? 'rgba(57, 255, 20, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                        color: folder.containerRunning ? 'var(--neon-green)' : '#ff6b6b',
                        border: `1px solid ${folder.containerRunning ? 'var(--neon-green)' : '#ff6b6b'}`,
                      }}
                    >
                      {folder.containerRunning ? '● RUNNING' : '○ STOPPED'}
                    </span>
                  ) : (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: 'rgba(255, 165, 0, 0.2)',
                        color: '#ffa500',
                        border: '1px solid #ffa500',
                      }}
                    >
                      ⚠️ NO CONTAINER
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {folder.hasContainer && folder.containerId && (
                    <>
                      {!folder.containerRunning ? (
                        <button
                          onClick={() => handleAction(folder.containerId!, 'start')}
                          className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                          style={{
                            background: 'linear-gradient(135deg, var(--neon-green) 0%, var(--neon-cyan) 100%)',
                            color: 'var(--bg-darker)',
                          }}
                        >
                          ▶ Start
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAction(folder.containerId!, 'restart')}
                            className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                            style={{
                              background: 'linear-gradient(135deg, var(--neon-yellow) 0%, var(--neon-pink) 100%)',
                              color: 'var(--bg-darker)',
                            }}
                          >
                            ⟳ Restart
                          </button>
                          <button
                            onClick={() => handleAction(folder.containerId!, 'stop')}
                            className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                            style={{
                              background: 'linear-gradient(135deg, #ff6b6b 0%, var(--neon-pink) 100%)',
                              color: 'white',
                            }}
                          >
                            ■ Stop
                          </button>
                        </>
                      )}
                      {folder.siteId && (
                        <Link
                          href={`/sites/${folder.siteId}`}
                          className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                          style={{
                            background: 'linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-pink) 100%)',
                            color: 'white',
                          }}
                        >
                          👁️ Details
                        </Link>
                      )}
                    </>
                  )}
                  {!folder.hasContainer && (
                    <>
                      <Link
                        href={`/sites/new?domain=${folder.domain}&path=${encodeURIComponent(folder.path)}`}
                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)',
                          color: 'white',
                        }}
                      >
                        🚀 Create Container
                      </Link>
                      <button
                        onClick={() => setFolderToDelete({ domain: folder.domain, path: folder.path })}
                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                        style={{
                          background: 'rgba(255, 107, 107, 0.2)',
                          border: '1px solid #ff6b6b',
                          color: '#ff6b6b',
                        }}
                      >
                        🗑️ Delete Files
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs font-mono opacity-60" style={{ color: 'var(--text-secondary)' }}>
                📂 {folder.path}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12">
        <SslStatus />
      </div>

      {folderToDelete && (
        <ConfirmModal
          title="Delete Folder"
          message={`Are you sure you want to delete the folder for "${folderToDelete.domain}"? This will permanently delete all files.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          onConfirm={handleDeleteFolder}
          onCancel={() => setFolderToDelete(null)}
        />
      )}

      <toast.ToastContainer />
    </div>
  );
}
