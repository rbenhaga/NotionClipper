import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ExternalLink, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function NotionPreviewEmbed({ onContentChange, autoReload = true }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [embedReady, setEmbedReady] = useState(false);
  const iframeRef = useRef(null);
  const reloadTimeoutRef = useRef(null);

  useEffect(() => {
    // Récupérer l'URL de preview depuis le backend
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

  // Écouter les changements de contenu et recharger après un délai
  useEffect(() => {
    if (!autoReload || !onContentChange) return;

    const handleContentChange = () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }

      reloadTimeoutRef.current = setTimeout(() => {
        updatePreview();
      }, 1500); // 1.5 secondes
    };

    // S'abonner aux changements
    window.addEventListener('clipboard-content-changed', handleContentChange);

    return () => {
      window.removeEventListener('clipboard-content-changed', handleContentChange);
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [autoReload, onContentChange]);

  const reloadPreview = () => {
    if (iframeRef.current && previewUrl) {
      setLoading(true);
      // Forcer le rechargement complet en changeant l'URL
      const timestamp = new Date().getTime();
      iframeRef.current.src = `${previewUrl}?t=${timestamp}`;
    }
  };

  const updatePreview = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/clipboard/preview`);
      const data = response.data;
      if (data.success) {
        // Recharger la page après mise à jour du contenu
        setTimeout(() => {
          reloadPreview();
        }, 500); // Petit délai pour laisser le temps au backend de traiter
      } else {
        setError(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('Erreur mise à jour preview:', err);
      setError('Impossible de mettre à jour la preview');
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const openInNotion = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const handleIframeLoad = () => {
    console.log('Iframe loaded successfully');
    setEmbedReady(true);
  };

  const handleIframeError = () => {
    console.error('Iframe loading error');
    setError('Impossible de charger la page Notion. Vérifiez que la page est publique.');
  };

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Prévisualisation Notion
          </span>
          {embedReady && (
            <CheckCircle size={14} className="text-green-500" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={updatePreview}
            disabled={loading || !previewUrl}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Actualiser avec le presse-papiers"
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
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                <p className="text-sm text-amber-800 font-medium mb-2">
                  Vérifiez que :
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• La page Notion est partagée publiquement (Share → Share to web)</li>
                  <li>• L'URL est correctement formatée</li>
                  <li>• Vous avez redémarré l'application après avoir configuré l'URL</li>
                </ul>
              </div>
              {previewUrl && (
                <button
                  onClick={openInNotion}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  Ouvrir dans Notion
                </button>
              )}
            </div>
          </div>
        ) : previewUrl ? (
          <>
            {/* Iframe pour l'embed Notion */}
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="absolute inset-0 w-full h-full"
              style={{
                border: 'none',
                backgroundColor: '#ffffff'
              }}
              title="Notion Page Preview"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              // Paramètres de sécurité adaptés pour Notion
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              allow="clipboard-read; clipboard-write"
            />
            
            {/* Loading overlay */}
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

      {/* Info footer */}
      {!error && previewUrl && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                {embedReady ? (
                  <>
                    <CheckCircle size={12} className="text-green-500" />
                    <span>Embed actif</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span>Chargement...</span>
                  </>
                )}
              </span>
            </div>
            <span className="text-gray-400">
              Ctrl+Shift+C pour basculer l'application
            </span>
          </div>
        </div>
      )}
    </div>
  );
}