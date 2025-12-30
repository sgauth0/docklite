'use client';

import { useState, useEffect, useRef } from 'react';
import FileEditorModal from './FileEditorModal';

interface FileEntry {
  name: string;
  isDirectory: boolean;
}

interface FileManagerProps {
  userSession?: { username: string; isAdmin: boolean } | null;
}

export default function FileManager({ userSession }: FileManagerProps) {
  // Determine initial path based on user role
  const getInitialPath = () => {
    if (!userSession) return '/var/www/sites';
    if (userSession.isAdmin) return '/var/www/sites';
    return `/var/www/sites/${userSession.username}`;
  };

  const [isOpen, setIsOpen] = useState(true);
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

  const handleBackClick = () => {
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));

    // Determine the minimum allowed path based on user role
    const minPath = userSession?.isAdmin ? '/var/www/sites' : `/var/www/sites/${userSession?.username}`;

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
      closeModal();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentPath);

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      fetchFiles(); // Refresh file list
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDownloadClick = (file: FileEntry) => {
    window.location.href = `/api/files/download?path=${encodeURIComponent(`${currentPath}/${file.name}`)}`;
  };

  if (!isOpen) {
    return (
      <div className="fixed left-0 z-50" style={{ top: 'calc(50vh + 40px)' }}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-800 hover:bg-gray-700 text-white px-2 py-4 rounded-r-lg shadow-lg transition-colors"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
        >
          📁 File Manager
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed left-0 bg-gray-900 text-white flex flex-col z-50"
      style={{ width: '320px', top: '80px', height: 'calc(100vh - 80px)' }}
    >
      <div className="p-4 bg-gray-800 flex justify-between items-center">
        <h2 className="text-lg font-bold">File Manager</h2>
        <div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
          <button onClick={handleUploadClick} className="mr-2 p-2 bg-blue-500 rounded">Upload</button>
          <button onClick={() => setIsOpen(false)} className="p-2 bg-red-500 rounded">&times;</button>
        </div>
      </div>
      <div className="p-2 bg-gray-800">
        <button
          onClick={handleBackClick}
          disabled={(() => {
            const minPath = userSession?.isAdmin ? '/var/www/sites' : `/var/www/sites/${userSession?.username}`;
            return currentPath === minPath;
          })()}
          className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600"
        >
          ← Back
        </button>
        <div className="text-xs truncate mt-2 opacity-70">{currentPath}</div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <ul>
            {files.map((file) => (
              <li key={file.name} className="flex justify-between items-center p-1 rounded hover:bg-gray-700">
                <span onClick={() => handleFileClick(file)} className="cursor-pointer">
                  {file.isDirectory ? '📁' : '📄'} {file.name}
                </span>
                {!file.isDirectory && (
                  <button onClick={() => handleDownloadClick(file)} className="p-1 bg-green-500 rounded text-xs">Download</button>
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