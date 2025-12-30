'use client';

import { ContainerInfo } from '@/types';
import Link from 'next/link';

interface ContainerCardProps {
  container: ContainerInfo;
  siteId?: number;
  onAction: (containerId: string, action: 'start' | 'stop' | 'restart') => void;
  onDragStart: (e: React.DragEvent, containerId: string) => void;
  onViewDetails?: (containerId: string, containerName: string) => void;
  onDelete?: (siteId: number, domain: string) => void;
}

export default function ContainerCard({ container, siteId, onAction, onDragStart, onViewDetails, onDelete }: ContainerCardProps) {
  const isRunning = container.state === 'running';
  const statusColor = isRunning ? 'var(--neon-green)' : '#ff6b6b';
  const statusIcon = isRunning ? '●' : '○';
  const statusText = isRunning ? 'ONLINE' : 'OFFLINE';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, container.id)}
      className="card-vapor p-5 rounded-xl cursor-move transition-all hover:scale-[1.02] hover:neon-glow group relative border border-purple-500/20"
      style={{
        background: 'linear-gradient(135deg, rgba(26, 10, 46, 0.95) 0%, rgba(10, 5, 16, 0.9) 100%)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Drag Handle - More subtle */}
      <div className="absolute top-2 left-2 opacity-30 group-hover:opacity-60 transition-opacity">
        <div className="w-1 h-1 bg-purple-400 rounded-full mb-1"></div>
        <div className="w-1 h-1 bg-purple-400 rounded-full mb-1"></div>
        <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
      </div>

      {/* Status Badge - Top right */}
      <div className="absolute top-3 right-3">
        <span 
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
          style={{
            background: isRunning ? 'rgba(57, 255, 20, 0.2)' : 'rgba(255, 107, 107, 0.2)',
            color: statusColor,
            border: `1px solid ${statusColor}`,
          }}
        >
          {statusIcon} {statusText}
        </span>
      </div>

      {/* Container Icon - More prominent */}
      <div className="flex items-center justify-center mb-4 mt-6">
        <div className="text-4xl" style={{ color: 'var(--neon-cyan)' }}>
          📦
        </div>
      </div>

      {/* Container Name - Better typography */}
      <div className="mb-4 text-center">
        <h3 className="font-bold text-lg neon-text mb-2 leading-tight" style={{ color: 'var(--neon-cyan)' }}>
          {container.name}
        </h3>
        <p className="text-xs font-mono opacity-75 truncate" style={{ color: 'var(--text-secondary)' }}>
          {container.image.split(':')[0]}
        </p>
      </div>

      {/* Container Info - Better organized */}
      <div className="space-y-2 mb-4">
        {/* Uptime */}
        {container.uptime && (
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            <span>⏱️</span>
            <span>{container.uptime}</span>
          </div>
        )}
        
        {/* Ports */}
        {container.ports && (
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--neon-purple)' }}>
            <span>🔌</span>
            <span className="truncate">{container.ports}</span>
          </div>
        )}
        
        {/* ID - Truncated */}
        <div className="flex items-center gap-2 text-xs font-mono opacity-60" style={{ color: 'var(--text-secondary)' }}>
          <span>🆔</span>
          <span className="truncate">{container.id.substring(0, 12)}</span>
        </div>
      </div>

      {/* Actions - Better button layout with tooltips */}
      <div className="flex gap-2 mt-auto pt-4 border-t border-purple-500/20">
        {!isRunning ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(container.id, 'start');
            }}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 group/btn"
            style={{
              background: 'linear-gradient(135deg, var(--neon-green) 0%, var(--neon-cyan) 100%)',
              color: 'var(--bg-darker)',
              boxShadow: '0 0 8px rgba(57, 255, 20, 0.4)'
            }}
            title="Start container"
          >
            <span className="group-hover/btn:scale-110 transition-transform inline-block">▶</span>
            <span className="ml-1">START</span>
          </button>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(container.id, 'restart');
              }}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 group/btn"
              style={{
                background: 'linear-gradient(135deg, var(--neon-yellow) 0%, var(--neon-pink) 100%)',
                color: 'var(--bg-darker)',
                boxShadow: '0 0 8px rgba(255, 255, 0, 0.4)'
              }}
              title="Restart container"
            >
              <span className="group-hover/btn:rotate-180 transition-transform inline-block duration-500">⟳</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(container.id, 'stop');
              }}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 group/btn"
              style={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, var(--neon-pink) 100%)',
                color: 'white',
                boxShadow: '0 0 8px rgba(255, 107, 107, 0.4)'
              }}
              title="Stop container"
            >
              <span className="group-hover/btn:scale-110 transition-transform inline-block">■</span>
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.(container.id, container.name);
          }}
          className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 group/btn"
          style={{
            background: 'linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-pink) 100%)',
            color: 'white',
            boxShadow: '0 0 8px rgba(181, 55, 242, 0.4)'
          }}
          title="View container details"
        >
          <span className="group-hover/btn:scale-110 transition-transform inline-block">👁️</span>
        </button>
      </div>

      {/* Delete Button - Full width at bottom */}
      {siteId && onDelete && (
        <div className="mt-3 pt-3 border-t border-purple-500/20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(siteId, container.labels?.['docklite.domain'] || container.name);
            }}
            className="w-full px-3 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(220, 20, 60, 0.2) 100%)',
              border: '1px solid #ff6b6b',
              color: '#ff6b6b',
            }}
            title="Delete site"
          >
            🗑️ Delete Site
          </button>
        </div>
      )}
    </div>
  );
}
