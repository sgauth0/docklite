'use client';

import { ContainerInfo } from '@/types';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Package, Clock, Plug, IdentificationCard, Eye, Trash, Play, ArrowsClockwise, Stop, DotsThree, Flower, Database, Lightning } from '@phosphor-icons/react';

interface ContainerCardProps {
  container: ContainerInfo;
  siteId?: number;
  onAction: (containerId: string, action: 'start' | 'stop' | 'restart') => void;
  onViewDetails?: (containerId: string, containerName: string) => void;
  onDelete?: (siteId: number, domain: string) => void;
}

export default function ContainerCard({ container, siteId, onAction, onViewDetails, onDelete }: ContainerCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const stopDnd = (event: React.PointerEvent) => event.stopPropagation();

  const isRunning = container.state === 'running';
  const statusColor = isRunning ? 'var(--neon-green)' : '#ff6b6b';
  const statusIcon = isRunning ? '●' : '○';
  const statusText = isRunning ? 'ONLINE' : 'OFFLINE';

  // Determine container type from labels
  const containerType = container.labels?.['docklite.type'] || 'other';
  const isSite = ['static', 'php', 'node'].includes(containerType);
  const isDatabase = containerType === 'postgres';

  // Set border color based on type
  const borderColor = isSite
    ? 'var(--neon-pink)'
    : isDatabase
    ? 'var(--neon-green)'
    : 'var(--neon-cyan)';

  // Get actual hex color for shadows (CSS vars don't always work in box-shadow)
  const shadowColor = isSite
    ? '#ff10f0'
    : isDatabase
    ? '#39ff14'
    : '#00ffff';

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className="p-4 rounded-xl cursor-move transition-all hover:scale-[1.02] group relative h-[340px] flex flex-col"
      style={{
        background: 'rgba(10, 5, 20, 0.3)',
        backdropFilter: 'blur(12px)',
        border: `2px solid ${shadowColor}`,
        boxShadow: `
          0 0 5px ${shadowColor},
          0 0 10px ${shadowColor},
          0 0 20px ${shadowColor},
          0 0 30px ${shadowColor}80,
          inset 0 0 5px ${shadowColor},
          inset 0 0 10px ${shadowColor},
          inset 0 0 20px ${shadowColor}60
        `,
        overflow: 'visible',
      }}
    >
      {/* 3-Dot Menu - Top left */}
      <div className="absolute top-3 left-3 z-10" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          onPointerDown={stopDnd}
          className="p-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
          style={{
            background: 'transparent',
            border: `2px solid ${shadowColor}`,
            color: shadowColor,
            boxShadow: `
              0 0 5px ${shadowColor},
              0 0 10px ${shadowColor}60,
              inset 0 0 5px ${shadowColor}40
            `
          }}
          title="More options"
        >
          <DotsThree size={16} weight="bold" />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div
            className="absolute top-full left-0 mt-2 rounded-lg overflow-hidden animate-slide-down"
            style={{
              background: 'linear-gradient(135deg, rgba(26, 10, 46, 0.98) 0%, rgba(10, 5, 30, 0.98) 100%)',
              border: '1px solid var(--neon-purple)',
              boxShadow: '0 0 20px rgba(181, 55, 242, 0.4)',
              minWidth: '180px',
              zIndex: 1000,
            }}
          >
            {siteId && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(siteId, container.labels?.['docklite.domain'] || container.name);
                }}
                onPointerDown={stopDnd}
                className="w-full px-4 py-3 text-left text-sm font-bold transition-all hover:bg-red-500/20 flex items-center gap-3"
                style={{ color: '#ff6b6b' }}
              >
                <Trash size={16} weight="duotone" />
                Delete Site
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status Crate - Top center */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2">
        <Package
          size={48}
          weight="duotone"
          style={{
            color: isRunning ? '#00ffff' : '#4a4a4a',
            filter: isRunning
              ? 'drop-shadow(0 0 8px #00ffff) drop-shadow(0 0 12px #00ffff) drop-shadow(0 0 16px #00ffff80)'
              : 'drop-shadow(0 0 2px #4a4a4a40)',
          }}
        />
      </div>

      {/* Container Name - Better typography */}
      <div className="mb-3 text-center mt-14 relative z-20" style={{ overflow: 'visible', background: 'transparent' }}>
        <h3
          className="font-bold text-lg neon-text mb-2 leading-tight line-clamp-3"
          style={{
            color: 'var(--neon-cyan)',
            height: '6rem',
            background: 'transparent',
            border: 'none',
            padding: '20px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {container.name}
        </h3>
        <p className="text-xs font-mono opacity-75 truncate" style={{ color: 'var(--text-secondary)' }}>
          {container.image.split(':')[0]}
        </p>
      </div>

      {/* Container Info - Better organized */}
      <div className="space-y-1.5 mb-3">
        {/* Uptime */}
        {container.uptime && (
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            <Clock size={16} weight="duotone" />
            <span>{container.uptime}</span>
          </div>
        )}

        {/* Ports */}
        {container.ports && (
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--neon-purple)' }}>
            <Plug size={16} weight="duotone" />
            <span className="truncate">{container.ports}</span>
          </div>
        )}

        {/* ID - Truncated */}
        <div className="flex items-center gap-2 text-xs font-mono opacity-60" style={{ color: 'var(--text-secondary)' }}>
          <IdentificationCard size={16} weight="duotone" />
          <span className="truncate">{container.id.substring(0, 12)}</span>
        </div>
      </div>

      {/* Actions - Better button layout with tooltips */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-purple-500/20">
        {!isRunning ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(container.id, 'start');
            }}
            onPointerDown={stopDnd}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 group/btn flex items-center justify-center gap-1"
            style={{
              background: 'transparent',
              border: `2px solid ${shadowColor}`,
              color: shadowColor,
              boxShadow: `
                0 0 3px ${shadowColor},
                0 0 6px ${shadowColor}40,
                inset 0 0 3px ${shadowColor}30
              `
            }}
            title="Start container"
          >
            <Play size={16} weight="duotone" className="group-hover/btn:scale-110 transition-transform" />
            <span>START</span>
          </button>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(container.id, 'restart');
              }}
              onPointerDown={stopDnd}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 group/btn flex items-center justify-center"
              style={{
                background: 'transparent',
                border: `2px solid ${shadowColor}`,
                color: shadowColor,
                boxShadow: `
                  0 0 3px ${shadowColor},
                  0 0 6px ${shadowColor}40,
                  inset 0 0 3px ${shadowColor}30
                `
              }}
              title="Restart container"
            >
              <ArrowsClockwise size={16} weight="duotone" className="group-hover/btn:rotate-180 transition-transform duration-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(container.id, 'stop');
              }}
              onPointerDown={stopDnd}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 group/btn flex items-center justify-center"
              style={{
                background: 'transparent',
                border: `2px solid ${shadowColor}`,
                color: shadowColor,
                boxShadow: `
                  0 0 3px ${shadowColor},
                  0 0 6px ${shadowColor}40,
                  inset 0 0 3px ${shadowColor}30
                `
              }}
              title="Stop container"
            >
              <Stop size={16} weight="duotone" className="group-hover/btn:scale-110 transition-transform" />
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.(container.id, container.name);
          }}
          onPointerDown={stopDnd}
          className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 group/btn flex items-center justify-center"
          style={{
            background: 'transparent',
            border: `2px solid ${shadowColor}`,
            color: shadowColor,
            boxShadow: `
              0 0 3px ${shadowColor},
              0 0 6px ${shadowColor}40,
              inset 0 0 3px ${shadowColor}30
            `
          }}
          title="View container details"
        >
          <Eye size={16} weight="duotone" className="group-hover/btn:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
}
