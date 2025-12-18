'use client';

import { ContainerInfo } from '@/types';
import Link from 'next/link';

interface ContainerCardProps {
  container: ContainerInfo;
  siteId?: number;
  onAction: (containerId: string, action: 'start' | 'stop' | 'restart') => void;
  onDragStart: (e: React.DragEvent, containerId: string) => void;
}

export default function ContainerCard({ container, siteId, onAction, onDragStart }: ContainerCardProps) {
  const isRunning = container.state === 'running';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, container.id)}
      className="card-vapor p-4 rounded-xl cursor-move transition-all hover:scale-105 hover:neon-glow group"
      style={{
        minWidth: '280px',
        maxWidth: '280px',
      }}
    >
      {/* Status Indicator */}
      <div className="flex items-center justify-between mb-3">
        <span className={isRunning ? 'badge-running' : 'badge-stopped'}>
          {isRunning ? '● ONLINE' : '○ OFFLINE'}
        </span>
        <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          {container.uptime}
        </div>
      </div>

      {/* Container Name */}
      <div className="mb-3">
        <h3 className="font-bold text-lg neon-text truncate" style={{ color: 'var(--neon-cyan)' }}>
          {container.name}
        </h3>
        <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
          {container.image}
        </p>
      </div>

      {/* Ports */}
      {container.ports && (
        <div className="mb-3 text-xs font-mono" style={{ color: 'var(--neon-purple)' }}>
          🔌 {container.ports}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        {!isRunning ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(container.id, 'start');
            }}
            className="flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--neon-green) 0%, var(--neon-cyan) 100%)',
              color: 'var(--bg-darker)',
              boxShadow: '0 0 5px rgba(57, 255, 20, 0.5)'
            }}
          >
            ▶ START
          </button>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(container.id, 'restart');
              }}
              className="flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--neon-yellow) 0%, var(--neon-pink) 100%)',
                color: 'var(--bg-darker)',
                boxShadow: '0 0 5px rgba(255, 255, 0, 0.5)'
              }}
            >
              ⟳
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(container.id, 'stop');
              }}
              className="flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, var(--neon-pink) 100%)',
                color: 'white',
                boxShadow: '0 0 5px rgba(255, 107, 107, 0.5)'
              }}
            >
              ■
            </button>
          </>
        )}
        {siteId && (
          <Link
            href={`/sites/${siteId}`}
            className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-pink) 100%)',
              color: 'white',
              boxShadow: '0 0 5px rgba(181, 55, 242, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            👁️
          </Link>
        )}
      </div>
    </div>
  );
}
