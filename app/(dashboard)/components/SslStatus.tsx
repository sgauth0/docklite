
'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/lib/hooks/useToast';

interface SslStatus {
  domain: string;
  hasSSL: boolean;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  status: 'valid' | 'expiring' | 'expired' | 'none';
}

export default function SslStatus() {
  const [sslStatus, setSslStatus] = useState<SslStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const fetchSslStatus = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/ssl/status');
      if (!res.ok) {
        throw new Error('Failed to fetch SSL status');
      }
      const data = await res.json();
      setSslStatus(data.sites);
      setError('');
      setLastChecked(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const repairSsl = async (domain: string) => {
    try {
      const res = await fetch('/api/ssl/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger repair');
      }
      toast.success(`Repair triggered for ${domain}`);
      fetchSslStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to repair SSL');
    }
  };

  useEffect(() => {
    fetchSslStatus();

    // Refresh every 5 minutes
    const interval = setInterval(fetchSslStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
          ⟳ Loading SSL status...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-sm font-bold" style={{ color: '#ff6b6b' }}>
          ❌ Error: {error}
        </div>
      </div>
    );
  }

  if (sslStatus.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
          No SSL certificates found
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'var(--neon-green)';
      case 'expiring':
        return '#ffa500';
      case 'expired':
        return '#ff6b6b';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return '✓';
      case 'expiring':
        return '⚠';
      case 'expired':
        return '✗';
      default:
        return '○';
    }
  };

  const formatExpiryDate = (date: string | null, days: number | null) => {
    if (!date) return 'Unknown';
    const expiryDate = new Date(date);
    const formatted = expiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    if (days !== null) {
      return `${formatted} (${days}d)`;
    }
    return formatted;
  };

  return (
    <div className="card-vapor p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold neon-text" style={{ color: 'var(--neon-cyan)' }}>
            🔒 SSL Certificates
          </h2>
          {lastChecked && (
            <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </div>
          )}
        </div>
        <button
          onClick={fetchSslStatus}
          disabled={refreshing}
          className="btn-neon px-4 py-2 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? 'Refreshing…' : 'Refresh SSL Status'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--neon-purple)' }}>
              <th className="text-left py-3 px-4" style={{ color: 'var(--neon-pink)' }}>
                DOMAIN
              </th>
              <th className="text-left py-3 px-4" style={{ color: 'var(--neon-pink)' }}>
                STATUS
              </th>
              <th className="text-left py-3 px-4" style={{ color: 'var(--neon-pink)' }}>
                EXPIRES
              </th>
              <th className="text-left py-3 px-4" style={{ color: 'var(--neon-pink)' }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {sslStatus.map((cert) => (
              <tr
                key={cert.domain}
                className="hover:bg-white/5 transition-colors"
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <td className="py-3 px-4" style={{ color: 'var(--neon-cyan)' }}>
                  {cert.domain}
                </td>
                <td className="py-3 px-4">
                  <span style={{ color: getStatusColor(cert.status) }}>
                    {getStatusIcon(cert.status)} {cert.status.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                  {cert.hasSSL ? formatExpiryDate(cert.expiryDate, cert.daysUntilExpiry) : 'No SSL'}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => repairSsl(cert.domain)}
                    className="btn-neon px-3 py-1 text-xs font-bold"
                  >
                    Repair SSL
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
