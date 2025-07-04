// src/react/src/components/modals/PageSelectorModal.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Globe, Plus } from 'lucide-react';

export default function PageSelectorModal({ isOpen, onClose, onSelectPages, pages, multiMode = false, sendMode, setSendMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrls, setSelectedUrls] = useState([]);
  const [manualUrl, setManualUrl] = useState('');
  const [filteredPages, setFilteredPages] = useState(pages);

  useEffect(() => {
    if (searchQuery) {
      const filtered = pages.filter(page =>
        page.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.url?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPages(filtered);
    } else {
      setFilteredPages(pages);
    }
  }, [searchQuery, pages]);

  const handleAddManualUrl = () => {
    if (manualUrl && manualUrl.includes('notion.')) {
      setSelectedUrls([...selectedUrls, manualUrl]);
      setManualUrl('');
    }
  };

  const handleConfirm = () => {
    onSelectPages(selectedUrls);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div className="bg-white rounded-notion p-6 w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-notion-gray-900">Sélectionner des pages</h2>
          <button onClick={onClose} className="p-1 hover:bg-notion-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Mode de sélection */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSendMode('pages')}
            className={`flex-1 px-3 py-2 rounded-notion text-sm font-medium transition-colors ${
              sendMode === 'pages' ? 'bg-blue-100 text-blue-700' : 'bg-notion-gray-100 text-notion-gray-700'
            }`}
          >
            Pages existantes
          </button>
          <button
            onClick={() => setSendMode('manual')}
            className={`flex-1 px-3 py-2 rounded-notion text-sm font-medium transition-colors ${
              sendMode === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-notion-gray-100 text-notion-gray-700'
            }`}
          >
            URL manuelle
          </button>
        </div>

        {sendMode === 'pages' ? (
          <>
            {/* Recherche */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-notion-gray-400" />
              <input
                type="text"
                placeholder="Rechercher des pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-notion-gray-200 rounded-notion text-sm focus:outline-none focus:ring-2 focus:ring-notion-gray-300"
              />
            </div>

            {/* Liste des pages */}
            <div className="flex-1 overflow-y-auto mb-4 max-h-[300px]">
              {filteredPages.map(page => (
                <label
                  key={page.id}
                  className="flex items-center gap-3 p-3 hover:bg-notion-gray-50 rounded cursor-pointer"
                >
                  <input
                    type={multiMode ? 'checkbox' : 'radio'}
                    name="page-select"
                    checked={selectedUrls.includes(page.url)}
                    onChange={(e) => {
                      if (multiMode) {
                        if (e.target.checked) {
                          setSelectedUrls([...selectedUrls, page.url]);
                        } else {
                          setSelectedUrls(selectedUrls.filter(url => url !== page.url));
                        }
                      } else {
                        setSelectedUrls([page.url]);
                      }
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-notion-gray-900">{page.title || 'Sans titre'}</div>
                    <div className="text-xs text-notion-gray-500 truncate">{page.url}</div>
                  </div>
                </label>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* URL manuelle */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-notion-gray-700 mb-2">
                Entrez l'URL de la page Notion
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://notion.so/..."
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-notion-gray-200 rounded-notion text-sm focus:outline-none focus:ring-2 focus:ring-notion-gray-300"
                />
                <button
                  onClick={handleAddManualUrl}
                  className="px-3 py-2 bg-blue-600 text-white rounded-notion text-sm font-medium hover:bg-blue-700"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* URLs sélectionnées */}
            <div className="flex-1 overflow-y-auto mb-4">
              {selectedUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-notion-gray-50 rounded mb-2">
                  <Globe size={14} className="text-notion-gray-400" />
                  <span className="flex-1 text-sm truncate">{url}</span>
                  <button
                    onClick={() => setSelectedUrls(selectedUrls.filter((_, i) => i !== index))}
                    className="p-1 hover:bg-notion-gray-200 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-notion-gray-200 rounded-notion text-sm font-medium hover:bg-notion-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedUrls.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-notion text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Confirmer ({selectedUrls.length})
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}