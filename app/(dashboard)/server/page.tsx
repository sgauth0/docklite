'use client';

import { useEffect, useState } from 'react';

export default function ServerPage() {
  const [serverInfo, setServerInfo] = useState({
    hostname: '',
    platform: '',
    arch: '',
    cpus: 0,
    totalMemory: 0,
    freeMemory: 0,
    uptime: 0,
    dockerVersion: '',
    containerCount: 0,
    imageCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This would be populated by an API endpoint in the future
    // For now, showing placeholder
    setServerInfo({
      hostname: window.location.hostname,
      platform: 'Linux',
      arch: 'x64',
      cpus: 4,
      totalMemory: 16,
      freeMemory: 8,
      uptime: 432000,
      dockerVersion: '29.1.2',
      containerCount: 10,
      imageCount: 15,
    });
    setLoading(false);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const formatMemory = (gb: number) => {
    return `${gb} GB`;
  };

  const memoryUsedPercent = Math.round(((serverInfo.totalMemory - serverInfo.freeMemory) / serverInfo.totalMemory) * 100);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-2xl font-bold neon-text" style={{ color: 'var(--neon-cyan)' }}>
          ⟳ Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold neon-text" style={{ color: 'var(--neon-green)' }}>
            🖥️ Server Overview
          </h1>
          <p className="mt-1 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            ▸ System information and resource usage ◂
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Info */}
        <div className="card-vapor p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-4 neon-text" style={{ color: 'var(--neon-cyan)' }}>
            💻 System Information
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>🌐 HOSTNAME</dt>
              <dd className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{serverInfo.hostname}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>🐧 PLATFORM</dt>
              <dd className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{serverInfo.platform}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>⚙️ ARCH</dt>
              <dd className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{serverInfo.arch}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>⏱️ UPTIME</dt>
              <dd className="text-sm font-mono" style={{ color: 'var(--neon-green)' }}>{formatUptime(serverInfo.uptime)}</dd>
            </div>
          </dl>
        </div>

        {/* Resources */}
        <div className="card-vapor p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-4 neon-text" style={{ color: 'var(--neon-pink)' }}>
            ⚡ Resources
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>🔥 CPU CORES</dt>
              <dd className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{serverInfo.cpus} cores</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>💾 TOTAL MEMORY</dt>
              <dd className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{formatMemory(serverInfo.totalMemory)}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>✨ AVAILABLE</dt>
              <dd className="text-sm font-mono" style={{ color: 'var(--neon-green)' }}>{formatMemory(serverInfo.freeMemory)}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold mb-2" style={{ color: 'var(--neon-purple)' }}>📊 MEMORY USAGE</dt>
              <dd>
                <div className="overflow-hidden h-4 rounded-lg" style={{
                  background: 'rgba(26, 10, 46, 0.6)',
                  border: '1px solid rgba(0, 255, 255, 0.3)'
                }}>
                  <div
                    style={{
                      width: `${memoryUsedPercent}%`,
                      background: 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-pink) 100%)',
                      boxShadow: '0 0 10px var(--neon-cyan)'
                    }}
                    className="h-full transition-all"
                  ></div>
                </div>
                <p className="text-xs font-mono mt-2" style={{ color: 'var(--neon-yellow)' }}>
                  {memoryUsedPercent}% used
                </p>
              </dd>
            </div>
          </dl>
        </div>

        {/* Docker Info */}
        <div className="card-vapor p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-4 neon-text" style={{ color: 'var(--neon-purple)' }}>
            🐳 Docker
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>📦 VERSION</dt>
              <dd className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{serverInfo.dockerVersion}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>🚀 CONTAINERS</dt>
              <dd className="text-sm font-mono badge-running">{serverInfo.containerCount} RUNNING</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>💿 IMAGES</dt>
              <dd className="text-sm font-mono" style={{ color: 'var(--neon-cyan)' }}>{serverInfo.imageCount} total</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 card-vapor p-6 rounded-xl border-2" style={{ borderColor: 'rgba(181, 55, 242, 0.3)' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--neon-purple)' }}>
              ▸ COMING SOON ◂
            </p>
            <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              Real-time CPU, memory, disk, and network usage metrics will be available soon! ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
