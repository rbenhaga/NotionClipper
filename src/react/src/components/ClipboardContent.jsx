import React from 'react';
import { FileVideo, FileAudio, Table, Image } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ClipboardContent({ clipboard, contentType }) {
  const renderPreview = () => {
    const type = contentType || clipboard?.detectedType || clipboard?.type;
    
    switch (type) {
      case 'video':
        // Pour les URLs YouTube/Vimeo
        if (clipboard.content.includes('youtube.com') || clipboard.content.includes('youtu.be')) {
          const videoId = clipboard.content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
          if (videoId) {
            return (
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            );
          }
        }
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
        const lines = clipboard.content.split('\n').slice(0, 5);
        const headers = lines[0]?.split(/[\t,]/) || [];
        return (
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Table size={20} className="text-green-600" />
              <p className="font-medium text-green-900">Tableau détecté</p>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs bg-white rounded border border-green-200">
                <thead>
                  <tr className="bg-green-100">
                    {headers.map((header, i) => (
                      <th key={i} className="px-2 py-1 text-left border-r border-green-200">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.slice(1, 4).map((line, i) => (
                    <tr key={i}>
                      {line.split(/[\t,]/).map((cell, j) => (
                        <td key={j} className="px-2 py-1 border-r border-t border-green-200">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {lines.length > 4 && (
                <div className="text-green-600 mt-1 text-xs">
                  ... +{lines.length - 4} lignes
                </div>
              )}
            </div>
          </div>
        );
        
      case 'image':
        // Pour les images base64
        if (clipboard.content?.startsWith('data:image/')) {
          return (
            <div className="p-4">
              <img 
                src={clipboard.content} 
                alt="Image du presse-papiers" 
                className="max-w-full h-auto rounded-lg shadow-md"
                style={{ maxHeight: '300px' }}
              />
            </div>
          );
        }
        // Pour les URLs d'images
        if (clipboard.content?.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) {
          return (
            <div className="p-4">
              <img 
                src={clipboard.content} 
                alt="Image" 
                className="max-w-full h-auto rounded-lg shadow-md"
                style={{ maxHeight: '300px' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="text-red-500">Impossible de charger l\'image</div>';
                }}
              />
            </div>
          );
        }
        return (
          <div className="p-4 bg-indigo-50 rounded-lg flex items-center gap-3">
            <Image size={24} className="text-indigo-600" />
            <p className="font-medium text-indigo-900">Image dans le presse-papiers</p>
          </div>
        );
        
      case 'code':
        return (
          <div className="p-4 bg-gray-900 rounded-lg overflow-x-auto">
            <pre className="text-xs text-gray-100 font-mono">
              <code>{clipboard.content.substring(0, 500)}</code>
            </pre>
            {clipboard.content.length > 500 && (
              <div className="text-gray-400 text-xs mt-2">
                ... +{clipboard.content.length - 500} caractères
              </div>
            )}
          </div>
        );
        
      default:
        // Markdown
        if (clipboard?.detectedType === 'markdown' || clipboard?.content?.includes('#') || clipboard?.content?.includes('**')) {
          return (
            <div className="prose prose-sm max-w-none p-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {clipboard.content.substring(0, 500)}
              </ReactMarkdown>
              {clipboard.content.length > 500 && (
                <div className="text-gray-500 text-xs mt-2">
                  ... +{clipboard.content.length - 500} caractères
                </div>
              )}
            </div>
          );
        }
        
        // Texte par défaut
        return (
          <div className="text-sm text-notion-gray-600 font-mono whitespace-pre-wrap break-words p-4">
            {clipboard.content.substring(0, 200)}
            {clipboard.content.length > 200 && '...'}
          </div>
        );
    }
  };
  return <div className="mt-4">{renderPreview()}</div>;
} 