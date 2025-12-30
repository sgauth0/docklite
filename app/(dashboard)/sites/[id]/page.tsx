'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Site, ContainerInfo, ContainerStats } from '@/types';
import DeleteSiteModal from '../../components/DeleteSiteModal';

export default function SiteDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [site, setSite] = useState<Site | null>(null);
  const [container, setContainer] = useState<ContainerInfo | null>(null);
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchData = async () => {
    try {
      const [siteRes, containerRes, logsRes] = await Promise.all([
        fetch(`/api/sites/${id}`),
        fetch(`/api/containers/${site?.container_id || ''}`),
        fetch(`/api/containers/${site?.container_id || ''}/logs?tail=50`),
      ]);

      if (siteRes.ok) {
        const siteData = await siteRes.json();
        setSite(siteData.site);

        if (containerRes.ok) {
          const containerData = await containerRes.json();
          setContainer(containerData.container);
          setStats(containerData.stats);
        }

        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs);
        }
      } else {
        setError('Site not found');
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load site details');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!site) {
      fetch(`/api/sites/${id}`)
        .then(res => res.json())
        .then(data => setSite(data.site));
    }
  }, [id, site]);

  useEffect(() => {
    if (site) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site]);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!site) return;

    try {
      const res = await fetch(`/api/containers/${site.container_id}/${action}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error(`Failed to ${action} container`);
      fetchData();
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete site');
      router.push('/');
    } catch (err) {
      alert(`Error: ${err}`);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error || !site) {
    return <div className="text-center py-12 text-red-600">{error || 'Site not found'}</div>;
  }

  const isRunning = container?.state === 'running';

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-900">
            ← Back to Sites
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{site.domain}</h1>
        </div>
        <div className="mt-4 sm:mt-0 space-x-2">
          {!isRunning ? (
            <button
              onClick={() => handleAction('start')}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              Start
            </button>
          ) : (
            <>
              <button
                onClick={() => handleAction('restart')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Restart
              </button>
              <button
                onClick={() => handleAction('stop')}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
              >
                Stop
              </button>
            </>
          )}
          <button
            onClick={handleDeleteClick}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Site Information</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Domain</dt>
              <dd className="text-sm text-gray-900">{site.domain}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="text-sm text-gray-900">{site.template_type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Code Path</dt>
              <dd className="text-sm text-gray-900">{`/var/www/sites/${site.username}/${site.domain}`}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Container ID</dt>
              <dd className="text-sm text-gray-900 font-mono">{site.container_id?.substring(0, 12)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {container?.state || 'unknown'}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {stats && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Resource Usage</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">CPU</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats.cpu.toFixed(2)}%</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Memory</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.memory.percentage.toFixed(2)}%
                </dd>
                <dd className="text-sm text-gray-500">
                  {(stats.memory.used / 1024 / 1024).toFixed(0)} MB / {(stats.memory.total / 1024 / 1024).toFixed(0)} MB
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Container Logs</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-auto max-h-96 font-mono">
          {logs || 'No logs available'}
        </pre>
      </div>

      {showDeleteModal && site && (
        <DeleteSiteModal
          siteDomain={site.domain}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
}
