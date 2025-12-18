'use client';

import { useState } from 'react';
import { ContainerInfo, Site } from '@/types';
import ContainerCard from './ContainerCard';

interface FolderProps {
  id: string;
  name: string;
  containerIds: string[];
  allContainers: ContainerInfo[];
  sites: Site[];
  onAction: (containerId: string, action: 'start' | 'stop' | 'restart') => void;
  onDragStart: (e: React.DragEvent, containerId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  onDelete: (folderId: string) => void;
}

export default function Folder({
  id,
  name,
  containerIds,
  allContainers,
  sites,
  onAction,
  onDragStart,
  onDragOver,
  onDrop,
  onRename,
  onDelete,
}: FolderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);

  const containers = allContainers.filter(c => containerIds.includes(c.id));

  const handleRename = () => {
    if (editName.trim() && editName !== name) {
      onRename(id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <>
      {/* Folder Card */}
      <div
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, id)}
        className="card-vapor p-6 rounded-xl cursor-pointer transition-all hover:scale-105 hover:neon-glow"
        style={{
          minWidth: '280px',
          maxWidth: '280px',
          minHeight: '180px',
        }}
        onClick={() => setIsOpen(true)}
      >
        <div className="text-center">
          <div className="text-6xl mb-3">📁</div>
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setEditName(name);
                  setIsEditing(false);
                }
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              className="input-vapor w-full text-center font-bold"
              autoFocus
            />
          ) : (
            <h3
              className="font-bold text-lg neon-text"
              style={{ color: 'var(--neon-pink)' }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              {name}
            </h3>
          )}
          <p className="text-sm font-mono mt-2" style={{ color: 'var(--text-secondary)' }}>
            {containerIds.length} container{containerIds.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="card-vapor neon-border max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">📁</span>
                <h2 className="text-2xl font-bold neon-text" style={{ color: 'var(--neon-pink)' }}>
                  {name}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg font-bold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)',
                    color: 'var(--bg-darker)',
                    boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                  }}
                >
                  ✏️ Rename
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete folder "${name}"? (Containers will not be deleted)`)) {
                      onDelete(id);
                      setIsOpen(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg font-bold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #ff6b6b 0%, var(--neon-pink) 100%)',
                    color: 'white',
                    boxShadow: '0 0 10px rgba(255, 107, 107, 0.5)'
                  }}
                >
                  🗑️ Delete
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg font-bold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-pink) 100%)',
                    color: 'white',
                    boxShadow: '0 0 10px rgba(181, 55, 242, 0.5)'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {containers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>
                  📭 Folder is empty
                </p>
                <p className="text-sm font-mono mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Drag containers here to organize them
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {containers.map(container => {
                  const site = sites.find(s => s.container_id === container.id);
                  return (
                    <ContainerCard
                      key={container.id}
                      container={container}
                      siteId={site?.id}
                      onAction={onAction}
                      onDragStart={onDragStart}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
