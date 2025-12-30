'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ContainerInfo, Folder } from '@/types';
import ContainerCard from './components/ContainerCard';
import ContainerDetailsModal from './components/ContainerDetailsModal';
import DeleteSiteModal from './components/DeleteSiteModal';
import AllContainersModal from './components/AllContainersModal';
import FolderSection from './components/FolderSection';
import SkeletonLoader from './components/SkeletonLoader';
import { useToast } from '@/lib/hooks/useToast';

interface FolderWithContainers {
  folder: Folder;
  containers: ContainerInfo[];
}

type ContainerType = 'all' | 'sites' | 'databases' | 'other';

export default function DashboardPage() {
  const [foldersData, setFoldersData] = useState<FolderWithContainers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [selectedContainerName, setSelectedContainerName] = useState<string>('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<{ id: number; domain: string } | null>(null);
  const [showAllContainersModal, setShowAllContainersModal] = useState(false);
  const [filterType, setFilterType] = useState<ContainerType>('all');
  const toast = useToast();

  const fetchData = async () => {
    try {
      const res = await fetch('/api/containers');
      if (!res.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await res.json();
      setFoldersData(data.folders || []);
    } catch (err) {
      setError('Failed to load containers');
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

  const getContainerType = (container: ContainerInfo): 'site' | 'database' | 'other' => {
    const labels = container.labels || {};
    if (labels['docklite.type'] === 'static' || labels['docklite.type'] === 'php' || labels['docklite.type'] === 'node') {
      return 'site';
    }
    if (labels['docklite.type'] === 'postgres' || labels['docklite.database']) {
      return 'database';
    }
    return 'other';
  };

  const getContainerBadge = (container: ContainerInfo): string => {
    const type = getContainerType(container);
    if (type === 'site') return '🌸';
    if (type === 'database') return '💾';
    return '⚡';
  };

  const filterContainers = (containers: ContainerInfo[]): ContainerInfo[] => {
    if (filterType === 'all') return containers;

    return containers.filter(container => {
      const type = getContainerType(container);
      if (filterType === 'sites') return type === 'site';
      if (filterType === 'databases') return type === 'database';
      if (filterType === 'other') return type === 'other';
      return true;
    });
  };

  const totalContainers = foldersData.reduce((acc, f) => acc + f.containers.length, 0);
  const filteredFolders = foldersData.map(f => ({
    ...f,
    containers: filterContainers(f.containers)
  })).filter(f => f.containers.length > 0);

  const handleDeleteClick = (siteId: number, domain: string) => {
    setSiteToDelete({ id: siteId, domain });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!siteToDelete) return;

    try {
      const res = await fetch(`/api/sites/${siteToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete site');
      toast.success(`Site "${siteToDelete.domain}" deleted successfully!`);
      setDeleteModalOpen(false);
      setSiteToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(`Error: ${err.message || err}`);
      setDeleteModalOpen(false);
      setSiteToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setSiteToDelete(null);
  };

  const handleContainerDrop = async (containerId: string, targetFolderId: number) => {
    try {
      // Add container to target folder
      const res = await fetch(`/api/folders/${targetFolderId}/containers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId }),
      });

      if (!res.ok) throw new Error('Failed to move container to folder');

      toast.success('Container moved successfully!');
      fetchData(); // Refresh to show new organization
    } catch (err: any) {
      toast.error(`Error: ${err.message || err}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold neon-text mb-2" style={{ color: 'var(--neon-cyan)' }}>
            📦 Containers
          </h1>
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            ▶ LOADING... ◀
          </p>
        </div>
        <SkeletonLoader type="card" count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="mb-8">
          <div className="text-6xl mb-4 animate-pulse">⚠️</div>
          <div className="text-xl font-bold mb-2" style={{ color: '#ff6b6b' }}>
            System Error Detected
          </div>
          <button onClick={fetchData} className="btn-neon px-6 py-3 font-bold">
            🔄 Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold neon-text mb-2" style={{ color: 'var(--neon-cyan)' }}>
            📦 Containers
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              ▶ SYSTEM STATUS: ONLINE ◀
            </p>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{
              background: 'rgba(57, 255, 20, 0.2)',
              color: 'var(--neon-green)',
              border: '1px solid var(--neon-green)'
            }}>
              {totalContainers} containers
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAllContainersModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-cyan) 100%)',
              color: 'white',
              boxShadow: '0 0 12px rgba(181, 55, 242, 0.4)',
            }}
          >
            🐳 All Containers
          </button>
          <Link
            href="/sites/new"
            className="btn-neon inline-flex items-center gap-2"
          >
            ✨ Create Site
          </Link>
        </div>
      </div>

      {/* Filter Dropdown */}
      <div className="mb-6">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ContainerType)}
          className="input-vapor px-4 py-2 text-sm font-bold"
          style={{
            minWidth: '200px',
            background: 'rgba(15, 5, 30, 0.7)',
            border: '2px solid var(--neon-cyan)',
          }}
        >
          <option value="all">📦 All Containers</option>
          <option value="sites">🌸 Sites Only</option>
          <option value="databases">💾 Databases Only</option>
          <option value="other">⚡ Other Containers</option>
        </select>
      </div>

      {totalContainers === 0 ? (
        <div className="mt-12 text-center py-16 card-vapor max-w-2xl mx-auto">
          <p className="text-xl font-bold neon-text mb-4" style={{ color: 'var(--neon-pink)' }}>
            No containers detected
          </p>
          <Link href="/sites/new" className="btn-neon inline-flex items-center gap-2">
            ✨ Create Your First Site
          </Link>
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="mt-12 text-center py-16 card-vapor max-w-2xl mx-auto">
          <p className="text-xl font-bold neon-text mb-4" style={{ color: 'var(--neon-pink)' }}>
            No containers match this filter
          </p>
          <button
            onClick={() => setFilterType('all')}
            className="btn-neon inline-flex items-center gap-2"
          >
            🔄 Show All
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredFolders.map(({ folder, containers }) => (
            <FolderSection
              key={folder.id}
              folder={folder}
              containers={containers}
              getContainerBadge={getContainerBadge}
              onAction={handleAction}
              onViewDetails={(id, name) => {
                setSelectedContainerId(id);
                setSelectedContainerName(name);
              }}
              onDelete={handleDeleteClick}
              onRefresh={fetchData}
              onContainerDrop={handleContainerDrop}
            />
          ))}
        </div>
      )}

      {selectedContainerId && (
        <ContainerDetailsModal
          containerId={selectedContainerId}
          containerName={selectedContainerName}
          onClose={() => {
            setSelectedContainerId(null);
            setSelectedContainerName('');
          }}
        />
      )}

      {deleteModalOpen && siteToDelete && (
        <DeleteSiteModal
          siteDomain={siteToDelete.domain}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {showAllContainersModal && (
        <AllContainersModal onClose={() => setShowAllContainersModal(false)} />
      )}

      <toast.ToastContainer />
    </div>
  );
}
