'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, UserSession } from '@/types';
import Link from 'next/link';

export default function CreateSitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    domain: '',
    template_type: 'static' as 'static' | 'php' | 'node',
    create_default_files: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedPath, setGeneratedPath] = useState('');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error('Error fetching user:', err));
  }, []);

  // Pre-fill form from URL parameters
  useEffect(() => {
    const domain = searchParams.get('domain');
    const path = searchParams.get('path');

    if (domain) {
      setFormData(prev => ({ ...prev, domain }));
    }
    if (path) {
      setFormData(prev => ({ ...prev, create_default_files: false }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      ...formData,
      user_id: currentUser?.userId,
    };

    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create site');
        setLoading(false);
        return;
      }

      setGeneratedPath(data.path);

      // Redirect to site detail page after a short delay to show the path
      setTimeout(() => {
        router.push(`/sites/${data.site.id}`);
      }, 2000);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold transition-all hover:scale-105" style={{ color: 'var(--neon-cyan)' }}>
          <span>←</span>
          <span>Back to Sites</span>
        </Link>
        <h1 className="mt-4 text-3xl lg:text-4xl font-bold neon-text" style={{ color: 'var(--neon-pink)' }}>
          ✨ Create New Site
        </h1>
      </div>

      <div className="card-vapor p-8 rounded-xl border border-purple-500/30">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="card-vapor p-4 rounded-lg border-2" style={{ borderColor: 'rgba(255, 107, 107, 0.5)', background: 'rgba(255, 107, 107, 0.1)' }}>
              <p className="font-bold flex items-center gap-2" style={{ color: '#ff6b6b' }}>
                <span>❌</span>
                <span>{error}</span>
              </p>
            </div>
          )}

          {generatedPath && (
            <div className="card-vapor p-4 rounded-lg border-2" style={{ borderColor: 'rgba(57, 255, 20, 0.5)', background: 'rgba(57, 255, 20, 0.1)' }}>
              <p className="font-bold flex items-center gap-2" style={{ color: 'var(--neon-green)' }}>
                <span>✓</span>
                <span>Site created at: <code className="font-mono">{generatedPath}</code></span>
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--neon-cyan)' }}>Redirecting...</p>
            </div>
          )}

          <div>
            <label htmlFor="domain" className="block text-sm font-bold mb-2" style={{ color: 'var(--neon-purple)' }}>
              🌐 Domain Name
            </label>
            <input
              type="text"
              id="domain"
              required
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="input-vapor w-full"
              placeholder="example.com"
            />
            <p className="mt-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              The domain name for this site (used for container naming)
            </p>
          </div>

          <div>
            <label htmlFor="template_type" className="block text-sm font-bold mb-2" style={{ color: 'var(--neon-purple)' }}>
              🎨 Site Type
            </label>
            <select
              id="template_type"
              value={formData.template_type}
              onChange={(e) => setFormData({ ...formData, template_type: e.target.value as any })}
              className="input-vapor w-full"
            >
              <option value="static">Static (nginx)</option>
              <option value="php">PHP (nginx + PHP-FPM)</option>
              <option value="node">Node.js</option>
            </select>
            <p className="mt-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              {formData.template_type === 'static' && '📄 Static HTML/CSS/JS files served by nginx'}
              {formData.template_type === 'php' && '🐘 PHP application with nginx and PHP-FPM'}
              {formData.template_type === 'node' && '🟢 Node.js application (requires package.json with start script)'}
            </p>
          </div>

          <div className="card-vapor p-4 rounded-lg border" style={{ borderColor: 'rgba(0, 255, 255, 0.3)', background: 'rgba(0, 255, 255, 0.05)' }}>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--neon-cyan)' }}>
              <span>📁</span>
              <span>Site Location</span>
            </h3>
            <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
              Your site will be created at:
            </p>
            <code className="block px-3 py-2 rounded text-sm font-mono" style={{ background: 'rgba(0, 255, 255, 0.1)', color: 'var(--neon-cyan)' }}>
              /var/www/sites/{currentUser?.username || '...'}/{formData.domain || 'example.com'}/
            </code>
            <p className="text-xs font-mono mt-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>
              Each site gets its own isolated directory for organization and security.
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'rgba(181, 55, 242, 0.1)' }}>
            <input
              type="checkbox"
              id="create_default_files"
              checked={formData.create_default_files}
              onChange={(e) => setFormData({ ...formData, create_default_files: e.target.checked })}
              className="h-5 w-5 rounded transition-all"
              style={{ accentColor: 'var(--neon-purple)' }}
            />
            <label htmlFor="create_default_files" className="text-sm font-bold cursor-pointer" style={{ color: 'var(--neon-purple)' }}>
              ✨ Create default starter files (recommended for new sites)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 border"
              style={{
                borderColor: 'rgba(255, 107, 107, 0.5)',
                color: '#ff6b6b',
                background: 'rgba(255, 107, 107, 0.1)'
              }}
            >
              ✕ Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-neon inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Create Site</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 card-vapor p-6 rounded-xl border" style={{ borderColor: 'rgba(181, 55, 242, 0.3)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--neon-purple)' }}>
          <span>💡</span>
          <span>Important Notes</span>
        </h3>
        <ul className="text-sm font-mono space-y-2" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex items-start gap-2">
            <span style={{ color: 'var(--neon-cyan)' }}>▸</span>
            <span>Make sure the code directory exists on the server before creating the site</span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: 'var(--neon-cyan)' }}>▸</span>
            <span>The container will be created and started automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: 'var(--neon-cyan)' }}>▸</span>
            <span>A random port will be assigned for web access</span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: 'var(--neon-cyan)' }}>▸</span>
            <span>Traefik will handle SSL and routing automatically</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
