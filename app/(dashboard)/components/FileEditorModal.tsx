
'use client';

import { useState } from 'react';

interface FileEditorModalProps {
  filePath: string;
  initialContent: string;
  onClose: () => void;
  onSave: (filePath: string, content: string) => Promise<void>;
}

export default function FileEditorModal({
  filePath,
  initialContent,
  onClose,
  onSave,
}: FileEditorModalProps) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    await onSave(filePath, content);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg shadow-lg w-3/4 h-3/4 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold">{filePath}</h2>
          <div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="mr-2 p-2 bg-blue-500 rounded">Edit</button>
            )}
            {isEditing && (
              <button onClick={handleSave} className="mr-2 p-2 bg-green-500 rounded">Save</button>
            )}
            <button onClick={onClose} className="p-2 bg-red-500 rounded">&times;</button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          {isEditing ? (
            <textarea
              className="w-full h-full bg-gray-900 text-white p-2 rounded"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          ) : (
            <pre className="whitespace-pre-wrap">{content}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
