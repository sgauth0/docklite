'use client';

import { useState } from 'react';

interface DeleteSiteModalProps {
  siteDomain: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteSiteModal({ siteDomain, onConfirm, onCancel }: DeleteSiteModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isValid = inputValue === siteDomain;

  const handleConfirm = async () => {
    if (!isValid) return;
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-vapor max-w-lg w-full p-8 neon-border relative animate-pulse-slow">
        {/* Warning Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">⚠️</div>
          <h2 className="text-3xl font-bold neon-text mb-2" style={{ color: '#ff6b6b' }}>
            DANGER ZONE
          </h2>
          <div className="text-sm font-mono" style={{ color: 'var(--neon-pink)' }}>
            ⚡ DESTRUCTIVE ACTION ⚡
          </div>
        </div>

        {/* Warning Message */}
        <div className="mb-6 p-4 rounded-lg" style={{
          background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 16, 240, 0.2) 100%)',
          border: '2px solid rgba(255, 107, 107, 0.5)'
        }}>
          <p className="text-lg font-bold mb-2" style={{ color: '#ff6b6b' }}>
            You are about to delete:
          </p>
          <p className="text-2xl font-bold font-mono mb-3" style={{ color: 'var(--neon-cyan)' }}>
            {siteDomain}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            This action will:
          </p>
          <ul className="text-sm mt-2 space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li>❌ Stop and remove the Docker container</li>
            <li>❌ Remove the site from the database</li>
            <li>⚠️ Files in /var/www/sites will remain</li>
            <li className="font-bold" style={{ color: '#ff6b6b' }}>⚠️ This action CANNOT be undone!</li>
          </ul>
        </div>

        {/* Confirmation Input */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2" style={{ color: 'var(--neon-pink)' }}>
            Type <span className="font-mono" style={{ color: 'var(--neon-cyan)' }}>{siteDomain}</span> to confirm:
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="input-vapor w-full font-mono"
            placeholder="Type the domain name..."
            autoFocus
            disabled={isDeleting}
          />
          {inputValue && !isValid && (
            <p className="text-sm mt-2 font-bold" style={{ color: '#ff6b6b' }}>
              ❌ Domain name doesn&apos;t match
            </p>
          )}
          {isValid && (
            <p className="text-sm mt-2 font-bold" style={{ color: 'var(--neon-green)' }}>
              ✓ Domain confirmed
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-3 px-6 rounded-lg font-bold transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgba(100, 100, 100, 0.3) 0%, rgba(60, 60, 60, 0.3) 100%)',
              border: '2px solid var(--neon-cyan)',
              color: 'var(--neon-cyan)'
            }}
          >
            ← Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || isDeleting}
            className="flex-1 py-3 px-6 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isValid
                ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.3) 0%, rgba(220, 20, 60, 0.3) 100%)'
                : 'rgba(100, 100, 100, 0.2)',
              border: `2px solid ${isValid ? '#ff6b6b' : 'rgba(100, 100, 100, 0.5)'}`,
              color: isValid ? '#ff6b6b' : 'rgba(150, 150, 150, 0.5)'
            }}
          >
            {isDeleting ? '⟳ Deleting...' : '🗑️ Delete Forever'}
          </button>
        </div>

        {/* Footer Warning */}
        <div className="mt-6 text-center">
          <div className="text-xs font-mono animate-pulse" style={{ color: '#ff6b6b' }}>
            ━━━━━━━━━━━━━━━━━━━━━━━
            <br />
            ⚠️ PERMANENT DELETION ⚠️
            <br />
            ━━━━━━━━━━━━━━━━━━━━━━━
          </div>
        </div>
      </div>
    </div>
  );
}
