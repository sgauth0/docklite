'use client';

import { useState, useEffect, useRef } from 'react';
import FileEditorModal from './FileEditorModal';

interface FileEntry {
  name: string;
  isDirectory: boolean;
}

interface FileManagerProps {
  userSession?: { username: string; isAdmin: boolean } | null;
  embedded?: boolean;
}

export default function FileManager({ userSession, embedded = false }: FileManagerProps) {
  // Determine initial path based on user role
  const getInitialPath = () => {
    if (!userSession) return '/var/www/sites';
    if (userSession.isAdmin) return '/var/www/sites';
    return `/var/www/sites/${userSession.username}`;
  };

  const [currentPath, setCurrentPath] = useState(getInitialPath());
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, [currentPath]);

  async function fetchFiles() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setFiles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleFileClick = async (file: FileEntry) => {
    if (file.isDirectory) {
      setCurrentPath(`${currentPath}/${file.name}`);
    } else {
      setSelectedFile(file);
      try {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(`${currentPath}/${file.name}`)}`);
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = await res.json();
        setFileContent(data.content);
        setIsModalOpen(true);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const minPath = userSession?.isAdmin
    ? '/var/www/sites'
    : userSession?.username
      ? `/var/www/sites/${userSession.username}`
      : '/var/www/sites';

  const handleBackClick = () => {
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));

    // Only navigate back if parent is within allowed directory
    if (parentPath && parentPath.length >= minPath.length) {
      setCurrentPath(parentPath);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setFileContent('');
  };

  const handleSaveFile = async (filePath: string, content: string) => {
    try {
      const res = await fetch('/api/files/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath, content }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCreateItem = async (type: 'file' | 'folder') => {
    const label = type === 'file' ? 'file' : 'folder';
    const name = window.prompt(`New ${label} name`);
    const trimmedName = name?.trim();
    if (!trimmedName) return;

    setError('');
    try {
      const res = await fetch('/api/files/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          basePath: currentPath,
          name: trimmedName,
          type,
        }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Failed to create ${label}`);
      }
      fetchFiles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    setError('');
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath);

        const res = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
      }
      fetchFiles(); // Refresh file list
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleDownloadClick = (file: FileEntry) => {
    window.location.href = `/api/files/download?path=${encodeURIComponent(`${currentPath}/${file.name}`)}`;
  };

  return (
    <div className={`flex flex-col h-full ${embedded ? '' : 'w-full'}`}>
      <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-cyan-300">File Browser</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-purple-200/70">Local Sites</div>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
          <button onClick={() => handleCreateItem('folder')} className="btn-neon px-3 py-1 text-xs font-bold">
            New Folder
          </button>
          <button onClick={() => handleCreateItem('file')} className="btn-neon px-3 py-1 text-xs font-bold">
            New File
          </button>
          <button onClick={handleUploadClick} className="btn-neon px-3 py-1 text-xs font-bold">
            Upload
          </button>
        </div>
      </div>
      <div className="p-3 border-b border-purple-500/20">
        <button
          onClick={handleBackClick}
          disabled={currentPath === minPath}
          className="btn-neon px-3 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        <div className="text-[11px] truncate mt-2 text-purple-200/70">{currentPath}</div>
      </div>
      <div className="flex-1 p-3 overflow-y-auto">
        {loading && <p className="text-sm text-cyan-200/80">Loading...</p>}
        {error && <p className="text-sm text-pink-300">{error}</p>}
        {!loading && !error && files.length === 0 && (
          <p className="text-xs text-purple-200/60">No files in this folder.</p>
        )}
        {!loading && !error && files.length > 0 && (
          <ul className="space-y-1">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-purple-900/30 transition-colors"
              >
                <button
                  onClick={() => handleFileClick(file)}
                  className="flex items-center gap-2 text-left min-w-0"
                >
                  <span>{file.isDirectory ? '📁' : '📄'}</span>
                  <span className="text-sm text-cyan-100 truncate">{file.name}</span>
                </button>
                {!file.isDirectory && (
                  <button
                    onClick={() => handleDownloadClick(file)}
                    className="btn-neon px-2 py-1 text-[11px] font-bold"
                  >
                    Download
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {isModalOpen && selectedFile && (
        <FileEditorModal
          filePath={`${currentPath}/${selectedFile.name}`}
          initialContent={fileContent}
          onClose={closeModal}
          onSave={handleSaveFile}
        />
      )}
    </div>
  );
}
