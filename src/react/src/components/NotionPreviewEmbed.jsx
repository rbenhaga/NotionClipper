import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ExternalLink, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function NotionPreviewEmbed({ autoReload = true }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [embedReady, setEmbedReady] = useState(false);
  const iframeRef = useRef(null);
  const reloadTimeoutRef = useRef(null);
  const lastContentRef = useRef('');
  const updatingRef = useRef(false);

  // Charger l'URL de preview au montage
  useEffect(() => {
    axios.get(`${API_URL}/preview/url`)
      .then(({ data }) => {
        if (data.success && data.url) {
          setPreviewUrl(data.url);
          setEmbedReady(true);
        } else {
          setError('Aucune page de preview configurée');
        }
      })
      .catch((err) => {
        console.error('Erreur récupération preview URL:', err);
        setError('Erreur de connexion au serveur');
      });
  }, []);

  // Fonction pour recharger la preview
  const reloadPreview = () => {
    if (iframeRef.current && previewUrl) {
      setLoading(true);
      const timestamp = new Date().getTime();
      const separator = previewUrl.includes('?') ? '&' : '?';
      iframeRef.current.src = `${previewUrl}${separator}theme=light&t=${timestamp}`;
      setTimeout(() => setLoading(false), 2000);
    }
  };

  // Fonction pour mettre à jour la preview
  const updatePreview = async () => {
    if (updatingRef.current || loading) return;
    const currentContent = window.lastClipboardContent || '';
    if (currentContent === lastContentRef.current) return;
    updatingRef.current = true;
    lastContentRef.current = currentContent;
    setError('');
    try {
      const response = await axios.post(`${API_URL}/clipboard/preview`, {
        content: currentContent,
        contentType: window.lastContentType || 'text'
      });
      if (response.data.success) {
        setTimeout(() => {
          reloadPreview();
          updatingRef.current = false;
        }, 500);
      } else {
        setError(response.data.error || 'Erreur lors de la mise à jour');
        updatingRef.current = false;
      }
    } catch (err) {
      console.error('Erreur mise à jour preview:', err);
      setError('Impossible de mettre à jour la preview');
      updatingRef.current = false;
    }
  };

  // Écouter les changements de contenu
  useEffect(() => {
    if (!autoReload) return;
    const handleContentChange = () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      reloadTimeoutRef.current = setTimeout(() => {
        updatePreview();
      }, 1500);
    };
    window.addEventListener('clipboard-content-changed', handleContentChange);
    return () => {
      window.removeEventListener('clipboard-content-changed', handleContentChange);
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [autoReload]);

  const handleIframeLoad = () => {
    setEmbedReady(true);
  };

  const handleIframeError = () => {
    setError('Impossible de charger la page Notion');
    setLoading(false);
  };

  const openInNotion = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Prévisualisation Notion
          </span>
          {embedReady && (
            <CheckCircle size={14} className="text-green-500" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => updatePreview()}
            disabled={loading || !previewUrl}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Actualiser manuellement"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openInNotion}
            disabled={!previewUrl}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ouvrir dans Notion"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
      {/* Content Area */}
      <div className="relative flex-1 bg-gray-50" style={{ minHeight: '400px' }}>
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="max-w-md text-center">
              <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
              <p className="text-red-600 font-medium mb-2">{error}</p>
            </div>
          </div>
        ) : previewUrl ? (
          <>
            <iframe
              ref={iframeRef}
              src={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}theme=light`}
              className="absolute inset-0 w-full h-full"
              style={{
                border: 'none',
                backgroundColor: '#ffffff'
              }}
              title="Notion Page Preview"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              allow="clipboard-read; clipboard-write"
            />
            {loading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="text-center">
                  <RefreshCw className="animate-spin text-gray-400 mx-auto mb-2" size={24} />
                  <p className="text-sm text-gray-600">Mise à jour en cours...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="animate-pulse">
                <div className="h-12 w-12 bg-gray-300 rounded-lg mx-auto mb-4"></div>
                <div className="h-4 w-48 bg-gray-300 rounded mx-auto mb-2"></div>
                <div className="h-3 w-32 bg-gray-300 rounded mx-auto"></div>
              </div>
              <p className="text-sm text-gray-500 mt-4">Chargement de la configuration...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}