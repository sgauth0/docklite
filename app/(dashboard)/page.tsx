'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Site, ContainerInfo } from '@/types';
import ContainerCard from './components/ContainerCard';
import Folder from './components/Folder';

interface FolderData {
  id: string;
  name: string;
  containerIds: string[];
}

export default function DashboardPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggedContainerId, setDraggedContainerId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  // Load folders from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('docklite-folders');
    if (saved) {
      try {
        setFolders(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load folders:', e);
      }
    }
  }, []);

  // Save folders to localStorage
  useEffect(() => {
    if (folders.length > 0 || localStorage.getItem('docklite-folders')) {
      localStorage.setItem('docklite-folders', JSON.stringify(folders));
    }
  }, [folders]);

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

  const handleDragStart = (e: React.DragEvent, containerId: string) => {
    setDraggedContainerId(containerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (!draggedContainerId) return;

    // Remove from all folders first
    const updatedFolders = folders.map(folder => ({
      ...folder,
      containerIds: folder.containerIds.filter(id => id !== draggedContainerId),
    }));

    // Add to target folder
    const targetFolder = updatedFolders.find(f => f.id === folderId);
    if (targetFolder && !targetFolder.containerIds.includes(draggedContainerId)) {
      targetFolder.containerIds.push(draggedContainerId);
    }

    setFolders(updatedFolders);
    setDraggedContainerId(null);
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: FolderData = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      containerIds: [],
    };

    setFolders([...folders, newFolder]);
    setNewFolderName('');
  };

  const renameFolder = (folderId: string, newName: string) => {
    setFolders(folders.map(f =>
      f.id === folderId ? { ...f, name: newName } : f
    ));
  };

  const deleteFolder = (folderId: string) => {
    setFolders(folders.filter(f => f.id !== folderId));
  };

  // Get containers not in any folder
  const allFolderContainerIds = new Set(folders.flatMap(f => f.containerIds));
  const unfolderedContainers = containers.filter(c => !allFolderContainerIds.has(c.id));

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
        <h1 className="text-3xl font-bold neon-text" style={{ color: 'var(--neon-cyan)' }}>
          📦 Docker Containers
        </h1>
        <Link
          href="/sites/new"
          className="mt-4 sm:mt-0 btn-neon inline-flex items-center"
        >
          ✨ Create Site
        </Link>
      </div>

      {/* Create Folder Input */}
      <div className="mb-6 card-vapor p-4 rounded-xl flex gap-3 items-center">
        <span className="text-2xl">📁</span>
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createFolder()}
          placeholder="Create new folder..."
          className="input-vapor flex-1"
        />
        <button
          onClick={createFolder}
          className="btn-neon"
          disabled={!newFolderName.trim()}
        >
          ➕ Create Folder
        </button>
      </div>

      {containers.length === 0 ? (
        <div className="mt-8 text-center py-12 card-vapor">
          <p className="text-lg font-bold" style={{ color: 'var(--neon-pink)' }}>
            📭 No containers found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {/* Folders */}
          {folders.map(folder => (
            <Folder
              key={folder.id}
              id={folder.id}
              name={folder.name}
              containerIds={folder.containerIds}
              allContainers={containers}
              sites={sites}
              onAction={handleAction}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDropOnFolder}
              onRename={renameFolder}
              onDelete={deleteFolder}
            />
          ))}

          {/* Unfoldered Containers */}
          {unfolderedContainers.map((container) => {
            const site = sites.find(s => s.container_id === container.id);
            return (
              <ContainerCard
                key={container.id}
                container={container}
                siteId={site?.id}
                onAction={handleAction}
                onDragStart={handleDragStart}
              />
            );
          })}
        </div>
      )}

      <div className="mt-6 text-center text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
        💡 Drag containers into folders to organize them ✨
      </div>
    </div>
  );
}
