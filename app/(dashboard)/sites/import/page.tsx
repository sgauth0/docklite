'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DetectedSite {
  containerId: string;
  containerName: string;
  domain?: string;
  type: 'static' | 'php' | 'node' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  codePath?: string;
  ports: string[];
  image: string;
  reasons: string[];
  alreadyImported: boolean;
  existingSiteId?: number;
}

export default function ImportSitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<DetectedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    fetchDetectedSites();
  }, []);

  const fetchDetectedSites = async () => {
    try {
      const res = await fetch('/api/sites/detect');
      if (!res.ok) throw new Error('Failed to detect sites');

      const data = await res.json();
      setSites(data.sites);
      setLoading(false);
    } catch (err) {
      setError('Failed to detect sites');
      setLoading(false);
    }
  };

  const handleImport = async (site: DetectedSite) => {
    if (!site.domain || !site.codePath) {
      alert('Cannot import: missing domain or code path');
      return;
    }

    setImporting(site.containerId);

    try {
      const res = await fetch('/api/sites/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerId: site.containerId,
          domain: site.domain,
          type: site.type,
          codePath: site.codePath,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to import');
      }

      // Refresh list
      fetchDetectedSites();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setImporting(null);
    }
  };

  const handleImportAll = async () => {
    const importable = sites.filter(s =>
      !s.alreadyImported &&
      s.codePath &&
      s.domain &&
      (s.confidence === 'high' || s.confidence === 'medium')
    );

    if (importable.length === 0) {
      alert('No sites to import');
      return;
    }

    if (!confirm(`Import ${importable.length} site${importable.length > 1 ? 's' : ''}?`)) {
      return;
    }

    for (const site of importable) {
      await handleImport(site);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800',
    };
    return colors[confidence as keyof typeof colors] || colors.low;
  };

  if (loading) {
    return <div className="text-center py-12">Scanning containers...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">{error}</div>;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <Link href="/sites" className="text-sm text-blue-600 hover:text-blue-900">
            ← Back to Sites
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Import Existing Sites</h1>
          <p className="mt-1 text-sm text-gray-500">
            Detected {sites.length} potential web server container{sites.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchDetectedSites}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Rescan
          </button>
          <button
            onClick={handleImportAll}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Import All
          </button>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="mt-8 text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No web server containers detected</p>
          <p className="text-sm text-gray-400 mt-2">
            Only containers with exposed web ports (80, 443, etc.) are shown
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sites.map((site) => (
            <div key={site.containerId} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {site.domain || site.containerName}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceBadge(site.confidence)}`}>
                      {site.confidence} confidence
                    </span>
                    {site.alreadyImported && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Already Imported
                      </span>
                    )}
                  </div>

                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Container</dt>
                      <dd className="text-gray-900 font-mono">{site.containerName}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Type</dt>
                      <dd className="text-gray-900">{site.type}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Image</dt>
                      <dd className="text-gray-900 font-mono text-xs">{site.image}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Ports</dt>
                      <dd className="text-gray-900">{site.ports.join(', ')}</dd>
                    </div>
                    {site.codePath && (
                      <div className="col-span-2">
                        <dt className="font-medium text-gray-500">Code Path</dt>
                        <dd className="text-gray-900 font-mono text-xs">{site.codePath}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Detection Reasons:</p>
                    <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                      {site.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="ml-4">
                  {site.alreadyImported ? (
                    <Link
                      href={`/sites/${site.existingSiteId}`}
                      className="px-4 py-2 text-sm text-blue-600 hover:text-blue-900"
                    >
                      View Site
                    </Link>
                  ) : site.codePath && site.domain ? (
                    <button
                      onClick={() => handleImport(site)}
                      disabled={importing === site.containerId}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {importing === site.containerId ? 'Importing...' : 'Import'}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">
                      Cannot import<br/>(missing data)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
