import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ExternalLink, Eye } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Fonction utilitaire pour transformer une URL publique Notion en URL d'embed
function toNotionEmbedUrl(url) {
  // Cherche un UUID de page Notion (32 caractères hex)
  const match = url.match(/[a-f0-9]{32}/);
  if (match) {
    return `https://www.notion.so/embed/${match[0]}?embed=true`;
  }
  return url;
}

export default function NotionPreviewEmbed() {
  const [previewUrl, setPreviewUrl] = useState('https://elemental-pea-edc.notion.site/ebd/225d744ed272800c98e6f48ca823bed8');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const webviewRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_URL}/preview/url`)
      .then(({ data }) => {
        if (data.success && data.url) setPreviewUrl(data.url);
        else setError('Preview non trouvée');
      })
      .catch(() => setError('Erreur récupération preview'));
  }, []);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    wv.addEventListener('did-fail-load', e => console.error('Webview load failed', e));
    wv.addEventListener('dom-ready',    () => console.log('Webview DOM ready'));
  }, [previewUrl]);

  const updatePreview = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/clipboard/preview`);
      const data = response.data;
      if (data.success) {
        setLastUpdate(new Date());
        setTimeout(() => {
          const webview = document.getElementById('notion-preview-webview');
          if (webview && typeof webview.loadURL === 'function') {
            webview.loadURL(previewUrl);
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
      const match = previewUrl.match(/embed\/([a-f0-9]{32})/);
      if (match) {
        window.open(`https://www.notion.so/${match[1]}`, '_blank');
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
      {/* Header */}
      <div className="w-full gap 1 flex bg-white items-center">
        <label className="block text-sm font-medium text-notion-gray-700 mb-2 flex items-center gap-2">
            <Eye size={14} />
            Prévisualisation Notion :
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
        </label>

      </div>
      {/* Content */}
      {error && <div className="error">{error}</div>}
      {!error && previewUrl && (
        <webview
          ref={webviewRef}
          src={toNotionEmbedUrl(previewUrl)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0,
            display: 'block',
            minHeight: 400
          }}
          partition="persist:notionPreview"
          allowpopups="true"
        />
      )}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="animate-spin text-notion-gray-400 mx-auto mb-2" size={24} />
            <p className="text-sm text-notion-gray-600">Mise à jour...</p>
          </div>
        </div>
      )}
    </div>
  );
}