
'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    async function fetchSslStatus() {
      try {
        const res = await fetch('/api/ssl/status');
        if (!res.ok) {
          throw new Error('Failed to fetch SSL status');
        }
        const data = await res.json();
        setSslStatus(data.sites);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
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
      <h2 className="text-2xl font-bold neon-text mb-6" style={{ color: 'var(--neon-cyan)' }}>
        🔒 SSL Certificates
      </h2>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
