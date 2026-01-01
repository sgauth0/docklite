'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ContainerInfo, FolderNode } from '@/types';
import ContainerCard from './components/ContainerCard';
import ContainerDetailsModal from './components/ContainerDetailsModal';
import AllContainersModal from './components/AllContainersModal';
import AddFolderModal from './components/AddFolderModal';
import FolderSection from './components/FolderSection';
import SkeletonLoader from './components/SkeletonLoader';
import SslStatus from './components/SslStatus';
import { useToast } from '@/lib/hooks/useToast';
import { Flower, Database, Lightning, Package, ArrowsClockwise, FolderPlus, PlusCircle } from '@phosphor-icons/react';
import AddContainerModal from './components/AddContainerModal';

type ContainerType = 'all' | 'sites' | 'databases' | 'other';

export default function DashboardPage() {
  const [foldersData, setFoldersData] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [selectedContainerName, setSelectedContainerName] = useState<string>('');
  const [showAllContainersModal, setShowAllContainersModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [subfolderParent, setSubfolderParent] = useState<{ id: number; name: string } | null>(null);
  const [showAddContainerModal, setShowAddContainerModal] = useState(false);
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} container`);
      }
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

  const getContainerBadge = (container: ContainerInfo): React.ReactNode => {
    const type = getContainerType(container);
    const iconStyle = {
      color: '#00ffff',
      filter: 'drop-shadow(0 0 6px #00ffff80) drop-shadow(0 0 10px #00ffff60)',
    };
    if (type === 'site') return <Flower size={32} weight="duotone" style={iconStyle} title="Site" />;
    if (type === 'database') return <Database size={32} weight="duotone" style={iconStyle} title="Database" />;
    return <Lightning size={32} weight="duotone" style={iconStyle} title="Utility" />;
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

  // Recursively count all containers in the tree
  const countContainers = (nodes: FolderNode[]): number => {
    return nodes.reduce((total, node) => {
      return total + node.containers.length + countContainers(node.children);
    }, 0);
  };

  // Recursively filter folders and their containers
  const filterFolderTree = (nodes: FolderNode[]): FolderNode[] => {
    return nodes.map(node => ({
      ...node,
      containers: filterContainers(node.containers),
      children: filterFolderTree(node.children)
    })).filter(node => {
      // Only hide folders if we're actively filtering AND they have no matches
      if (filterType === 'all') {
        return true; // Show all folders when not filtering
      }
      return node.containers.length > 0 || node.children.length > 0;
    });
  };

  const totalContainers = countContainers(foldersData);
  const filteredFolders = filterFolderTree(foldersData);

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

  const handleContainerReorder = async (folderId: number, containerId: string, newPosition: number) => {
    try {
      const res = await fetch(`/api/folders/${folderId}/containers/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId, newPosition }),
      });

      if (!res.ok) throw new Error('Failed to reorder container');

      toast.success('Container reordered!');
    } catch (err: any) {
      toast.error(`Error: ${err.message || err}`);
      throw err; // Re-throw so FolderSection can revert
    }
  };

  const handleAddSubfolder = (parentId: number, parentName: string) => {
    setSubfolderParent({ id: parentId, name: parentName });
    setShowAddFolderModal(true);
  };

  const handleDeleteFolder = async (folderId: number, folderName: string) => {
    if (!confirm(`Are you sure you want to delete the folder "${folderName}"? This will also delete all subfolders and their container assignments.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete folder');
      }

      toast.success(`Folder "${folderName}" deleted successfully!`);
      fetchData();
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
          <button onClick={fetchData} className="btn-neon px-6 py-3 font-bold inline-flex items-center gap-2">
            <ArrowsClockwise size={20} weight="duotone" />
            Retry Connection
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
          <button
            onClick={() => setShowAddContainerModal(true)}
            className="btn-neon inline-flex items-center gap-2"
          >
            <PlusCircle size={20} weight="duotone" />
            New Container
          </button>
          <button
            onClick={() => setShowAddFolderModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--neon-pink) 0%, var(--neon-purple) 100%)',
              color: 'white',
              boxShadow: '0 0 12px rgba(217, 15, 217, 0.4)',
            }}
          >
            <FolderPlus size={20} weight="duotone" />
            New Folder
          </button>
          <button
            onClick={() => setShowAllContainersModal(true)}
            className="btn-neon inline-flex items-center gap-2"
          >
            <Package size={20} weight="duotone" />
            All Containers
          </button>
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
          <option value="all">All Containers</option>
          <option value="databases">Databases Only</option>
          <option value="other">Other Containers</option>
        </select>
      </div>

      {totalContainers === 0 ? (
        <div className="mt-12 text-center py-16 card-vapor max-w-2xl mx-auto">
          <p className="text-xl font-bold neon-text mb-4" style={{ color: 'var(--neon-pink)' }}>
            No containers detected
          </p>
          <button
            onClick={() => setShowAllContainersModal(true)}
            className="btn-neon inline-flex items-center gap-2"
          >
            <Package size={20} weight="duotone" />
            View Containers
          </button>
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
            <ArrowsClockwise size={20} weight="duotone" />
            Show All
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredFolders.map((folderNode) => (
            <FolderSection
              key={folderNode.id}
              folderNode={folderNode}
              getContainerBadge={getContainerBadge}
              onAction={handleAction}
              onViewDetails={(id, name) => {
                setSelectedContainerId(id);
                setSelectedContainerName(name);
              }}
              onRefresh={fetchData}
              onContainerDrop={handleContainerDrop}
              onContainerReorder={handleContainerReorder}
              onAddSubfolder={handleAddSubfolder}
              onDeleteFolder={handleDeleteFolder}
            />
          ))}
        </div>
      )}

      {/* SSL Certificates Status */}
      <div className="mt-12">
        <SslStatus />
      </div>

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


      {showAllContainersModal && (
        <AllContainersModal onClose={() => setShowAllContainersModal(false)} />
      )}
      {showAddContainerModal && (
        <AddContainerModal
          onClose={() => setShowAddContainerModal(false)}
          onCreated={() => {
            fetchData();
          }}
        />
      )}

      {showAddFolderModal && (
        <AddFolderModal
          onClose={() => {
            setShowAddFolderModal(false);
            setSubfolderParent(null);
          }}
          onSuccess={() => {
            fetchData();
            toast.success(subfolderParent ? 'Subfolder created successfully!' : 'Folder created successfully!');
            setSubfolderParent(null);
          }}
          parentFolderId={subfolderParent?.id}
          parentFolderName={subfolderParent?.name}
        />
      )}

      <toast.ToastContainer />
    </div>
  );
}
