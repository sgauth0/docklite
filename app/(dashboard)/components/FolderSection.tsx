'use client';

import { useState } from 'react';
import { ContainerInfo, Folder } from '@/types';
import ContainerCard from './ContainerCard';

interface FolderSectionProps {
  folder: Folder;
  containers: ContainerInfo[];
  getContainerBadge: (container: ContainerInfo) => string;
  onAction: (containerId: string, action: 'start' | 'stop' | 'restart') => void;
  onViewDetails: (id: string, name: string) => void;
  onDelete: (siteId: number, domain: string) => void;
  onRefresh: () => void;
  onContainerDrop: (containerId: string, targetFolderId: number) => void;
}

export default function FolderSection({
  folder,
  containers,
  getContainerBadge,
  onAction,
  onViewDetails,
  onDelete,
  onRefresh,
  onContainerDrop,
}: FolderSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const containerId = e.dataTransfer.getData('containerId');
    if (containerId) {
      onContainerDrop(containerId, folder.id);
    }
  };

  const handleDragStart = (e: React.DragEvent, containerId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('containerId', containerId);
  };

  return (
    <div className="space-y-4">
      {/* Folder Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-3 group"
        >
          <span className="text-2xl transition-transform group-hover:scale-110">
            {isCollapsed ? '📁' : '📂'}
          </span>
          <h2 className="text-2xl font-bold neon-text transition-all group-hover:brightness-125" style={{ color: 'var(--neon-pink)' }}>
            {folder.name}
          </h2>
          <span className="text-sm font-mono px-2 py-1 rounded-full" style={{
            background: 'rgba(217, 15, 217, 0.2)',
            color: 'var(--neon-pink)',
            border: '1px solid var(--neon-pink)'
          }}>
            {containers.length}
          </span>
          <span className="text-xs opacity-50 group-hover:opacity-100 transition-opacity">
            {isCollapsed ? '▶' : '▼'}
          </span>
        </button>

        {/* Folder Actions */}
        {folder.name !== 'Default' && (
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-xs font-bold rounded-lg transition-all hover:scale-105"
              style={{
                background: 'rgba(255, 16, 240, 0.1)',
                border: '1px solid var(--neon-pink)',
                color: 'var(--neon-pink)'
              }}
            >
              ✏️ Rename
            </button>
            <button
              className="px-3 py-1 text-xs font-bold rounded-lg transition-all hover:scale-105"
              style={{
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid #ff6b6b',
                color: '#ff6b6b'
              }}
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>

      {/* Containers Grid - Drop Zone */}
      {!isCollapsed && (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 p-4 rounded-xl transition-all ${
            isDragOver
              ? 'bg-purple-500/20 border-2 border-purple-500 border-dashed'
              : 'border-2 border-transparent'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {containers.map((container) => {
            const badge = getContainerBadge(container);
            const siteId = container.labels?.['docklite.site.id'] ? parseInt(container.labels['docklite.site.id']) : 0;
            const domain = container.labels?.['docklite.domain'] || container.name;

            return (
              <div key={container.id} className="relative">
                {/* Badge Overlay */}
                <div
                  className="absolute -top-2 -right-2 z-10 text-2xl"
                  title={badge === '🌸' ? 'Site' : badge === '💾' ? 'Database' : 'Utility'}
                >
                  {badge}
                </div>

                <ContainerCard
                  container={container}
                  siteId={siteId}
                  onAction={onAction}
                  onViewDetails={onViewDetails}
                  onDragStart={handleDragStart}
                  onDelete={onDelete}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State - Drop Zone */}
      {!isCollapsed && containers.length === 0 && (
        <div
          className={`text-center py-12 card-vapor rounded-lg transition-all ${
            isDragOver
              ? 'bg-purple-500/20 border-2 border-purple-500 border-dashed scale-105'
              : 'border-2 border-transparent'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p className="text-sm font-mono opacity-50">
            {isDragOver ? '📦 Drop container here' : 'No containers in this folder'}
          </p>
        </div>
      )}
    </div>
  );
}
