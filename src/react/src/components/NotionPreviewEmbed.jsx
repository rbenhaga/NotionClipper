import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw, Maximize2, Minimize2, ExternalLink } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function NotionPreviewEmbed({ isVisible, onToggleVisibility }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Récupérer l'URL de la page preview au montage
  useEffect(() => {
    fetchPreviewUrl();
  }, []);

  const fetchPreviewUrl = async () => {
    try {
      const response = await fetch(`${API_URL}/preview/url`);
      
      if (!response.ok) {
        throw new Error('Preview page not found');
      }
      
      const data = await response.json();
      
      if (data.success && data.url) {
        // Convertir l'URL en URL d'embed Notion
        const pageId = data.pageId.replace(/-/g, '');
        const embedUrl = `https://v2.embednotion.com/embed/${pageId}`;
        setPreviewUrl(embedUrl);
        setError('');
      }
    } catch (err) {
      console.error('Erreur récupération URL preview:', err);
      setError('Page preview non configurée. Reconfigurez votre token Notion.');
    }
  };

  const updatePreview = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/clipboard/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preview');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLastUpdate(new Date());
        // Recharger l'iframe après un court délai
        setTimeout(() => {
          const iframe = document.getElementById('notion-preview-iframe');
          if (iframe) {
            iframe.src = iframe.src;
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Erreur mise à jour preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const openInNotion = () => {
    if (previewUrl) {
      // Extraire l'ID de la page de l'URL d'embed
      const match = previewUrl.match(/embed\/([a-f0-9]{32})/);
      if (match) {
        window.open(`https://www.notion.so/${match[1]}`, '_blank');
      }
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed bottom-4 right-4 bg-notion-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-notion-gray-700 transition-colors z-50"
        title="Afficher la preview"
      >
        <Eye size={20} />
      </button>
    );
  }

  return (
    <div className={`fixed ${isFullscreen ? 'inset-0' : 'bottom-4 right-4 w-96 h-[500px]'} bg-white rounded-notion shadow-2xl border border-notion-gray-200 flex flex-col transition-all duration-300 z-40`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-notion-gray-200 bg-notion-gray-50">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-notion-gray-600" />
          <span className="text-sm font-medium text-notion-gray-800">Preview Notion</span>
          {lastUpdate && (
            <span className="text-xs text-notion-gray-500">
              Mis à jour {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={updatePreview}
            disabled={loading || !!error}
            className="p-1.5 hover:bg-notion-gray-200 rounded transition-colors disabled:opacity-50"
            title="Actualiser avec le presse-papiers"
          >
            <RefreshCw size={14} className={`text-notion-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={openInNotion}
            disabled={!!error}
            className="p-1.5 hover:bg-notion-gray-200 rounded transition-colors disabled:opacity-50"
            title="Ouvrir dans Notion"
          >
            <ExternalLink size={14} className="text-notion-gray-600" />
          </button>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-notion-gray-200 rounded transition-colors"
            title={isFullscreen ? "Réduire" : "Plein écran"}
          >
            {isFullscreen ? 
              <Minimize2 size={14} className="text-notion-gray-600" /> : 
              <Maximize2 size={14} className="text-notion-gray-600" />
            }
          </button>
          
          <button
            onClick={onToggleVisibility}
            className="p-1.5 hover:bg-notion-gray-200 rounded transition-colors"
            title="Masquer la preview"
          >
            <EyeOff size={14} className="text-notion-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-white">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4">
              <p className="text-sm text-notion-gray-600 mb-2">{error}</p>
              <button
                onClick={fetchPreviewUrl}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : previewUrl ? (
          <iframe
            id="notion-preview-iframe"
            src={previewUrl}
            className="w-full h-full border-0"
            title="Notion Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-notion-gray-400">
              Chargement...
            </div>
          </div>
        )}
        
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="animate-spin text-notion-gray-400 mx-auto mb-2" size={24} />
              <p className="text-sm text-notion-gray-600">Mise à jour...</p>
            </div>
          </div>
        )}
      </div>

      {/* Resize handle for non-fullscreen mode */}
      {!isFullscreen && (
        <div className="absolute top-0 left-0 w-2 h-full cursor-w-resize hover:bg-blue-500 hover:opacity-20" />
      )}
    </div>
  );
}