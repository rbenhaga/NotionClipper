import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

export default function NotionPreview({ url, isVisible, onClose }) {
  const webviewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!webviewRef.current || !url) return;

    const webview = webviewRef.current;

    // Configuration avancée pour contourner CSP
    webview.addEventListener('dom-ready', () => {
      // Injecter du CSS pour améliorer l'affichage
      webview.insertCSS(`
        .notion-topbar { display: none !important; }
        .notion-sidebar { display: none !important; }
        .notion-page-content { padding: 20px !important; }
      `);
      webview.executeJavaScript(`
        document.addEventListener('click', (e) => {
          if (e.target.tagName === 'A') {
            e.preventDefault();
          }
        });
      `);
    });

    webview.addEventListener('did-start-loading', () => {
      setLoading(true);
      setError(null);
    });

    webview.addEventListener('did-stop-loading', () => {
      setLoading(false);
    });

    webview.addEventListener('did-fail-load', (e) => {
      setError(`Erreur de chargement: ${e.errorDescription}`);
      setLoading(false);
    });

    webview.addEventListener('will-navigate', (e) => {
      console.log('Navigation vers:', e.url);
    });

    return () => {
      webview.stop();
    };
  }, [url]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Aperçu Notion</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}

          <webview
            ref={webviewRef}
            src={url}
            partition="persist:notion-preview"
            webpreferences="contextIsolation=no"
            style={{
              width: '100%',
              height: '100%',
              display: loading || error ? 'none' : 'block'
            }}
          />
        </div>
      </div>
    </div>
  );
}