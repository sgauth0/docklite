'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateSitePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    domain: '',
    template_type: 'static' as 'static' | 'php' | 'node',
    create_default_files: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedPath, setGeneratedPath] = useState('');
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-900">
          ← Back to Sites
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Create New Site</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {generatedPath && (
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded">
              ✓ Site created at: <code className="font-mono">{generatedPath}</code>
              <br />
              Redirecting...
            </div>
          )}

          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
              Domain Name
            </label>
            <input
              type="text"
              id="domain"
              required
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="example.com"
            />
            <p className="mt-1 text-sm text-gray-500">
              The domain name for this site (used for container naming)
            </p>
          </div>

          <div>
            <label htmlFor="template_type" className="block text-sm font-medium text-gray-700">
              Site Type
            </label>
            <select
              id="template_type"
              value={formData.template_type}
              onChange={(e) => setFormData({ ...formData, template_type: e.target.value as any })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="static">Static (nginx)</option>
              <option value="php">PHP (nginx + PHP-FPM)</option>
              <option value="node">Node.js</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {formData.template_type === 'static' && 'Static HTML/CSS/JS files served by nginx'}
              {formData.template_type === 'php' && 'PHP application with nginx and PHP-FPM'}
              {formData.template_type === 'node' && 'Node.js application (requires package.json with start script)'}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">📁 Site Location</h3>
            <p className="text-sm text-blue-700 mb-2">
              Your site will be created at:
            </p>
            <code className="block bg-blue-100 text-blue-900 px-3 py-2 rounded text-sm font-mono">
              /var/www/sites/{currentUser?.username || '...'}/{formData.domain || 'example.com'}/
            </code>
            <p className="text-xs text-blue-600 mt-2">
              Each site gets its own isolated directory for organization and security.
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="create_default_files"
              checked={formData.create_default_files}
              onChange={(e) => setFormData({ ...formData, create_default_files: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="create_default_files" className="ml-2 block text-sm text-gray-900">
              Create default starter files (recommended for new sites)
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Site'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Note</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Make sure the code directory exists on the server before creating the site</li>
          <li>The container will be created and started automatically</li>
          <li>A random port will be assigned for web access</li>
          <li>You can set up nginx reverse proxy to route traffic to the container</li>
        </ul>
      </div>
    </div>
  );
}
