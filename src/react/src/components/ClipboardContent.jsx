import React from 'react';
import { FileVideo, FileAudio, Table, Image, FileText, Code } from 'lucide-react';

export default function ClipboardContent({ clipboard, contentType }) {
  const renderPreview = () => {
    switch (contentType || clipboard?.type) {
      case 'video':
        return (
          <div className="p-4 bg-blue-50 rounded-lg flex items-center gap-3">
            <FileVideo size={24} className="text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Vidéo détectée</p>
              <p className="text-sm text-blue-700">{clipboard.content.substring(0, 50)}...</p>
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="p-4 bg-purple-50 rounded-lg flex items-center gap-3">
            <FileAudio size={24} className="text-purple-600" />
            <div>
              <p className="font-medium text-purple-900">Audio détecté</p>
              <p className="text-sm text-purple-700">{clipboard.content.substring(0, 50)}...</p>
            </div>
          </div>
        );
      case 'table':
        const lines = clipboard.content.split('\n').slice(0, 3);
        return (
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Table size={20} className="text-green-600" />
              <p className="font-medium text-green-900">Tableau détecté</p>
            </div>
            <div className="text-xs font-mono bg-white p-2 rounded border border-green-200">
              {lines.map((line, i) => (
                <div key={i}>{line.substring(0, 50)}{line.length > 50 ? '...' : ''}</div>
              ))}
              {clipboard.content.split('\n').length > 3 && (
                <div className="text-green-600 mt-1">... +{clipboard.content.split('\n').length - 3} lignes</div>
              )}
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="p-4 bg-indigo-50 rounded-lg flex items-center gap-3">
            <Image size={24} className="text-indigo-600" />
            <p className="font-medium text-indigo-900">Image dans le presse-papiers</p>
          </div>
        );
      default:
        return (
          <div className="text-sm text-notion-gray-600 font-mono whitespace-pre-wrap break-words">
            {clipboard.content.substring(0, 200)}
            {clipboard.content.length > 200 && '...'}
          </div>
        );
    }
  };
  return <div className="mt-4">{renderPreview()}</div>;
} 