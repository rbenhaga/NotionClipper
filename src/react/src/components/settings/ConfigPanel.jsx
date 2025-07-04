// src/react/src/components/settings/ConfigPanel.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Key, 
  Image as ImageIcon, 
  Save, 
  Eye, 
  EyeOff,
  Trash2,
  RefreshCw
} from 'lucide-react';
import configService from '../../services/config';

export default function ConfigPanel({ isOpen, onClose, onConfigUpdate }) {
  const [notionToken, setNotionToken] = useState('');
  const [imgbbKey, setImgbbKey] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showImgbbKey, setShowImgbbKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Charger la configuration existante
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const response = await configService.getConfig();
      if (response.config) {
        setNotionToken(response.config.notionToken || '');
        setImgbbKey(response.config.imgbbKey || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Ne mettre à jour que si les valeurs ont changé et ne sont pas masquées
      const updates = {};
      
      if (notionToken && !notionToken.startsWith('****')) {
        updates.notionToken = notionToken;
      }
      
      if (imgbbKey && !imgbbKey.startsWith('****')) {
        updates.imgbbKey = imgbbKey;
      }

      const result = await configService.updateConfig(updates);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          if (onConfigUpdate) onConfigUpdate();
        }, 1000);
      } else {
        setError(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      setError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser la configuration ?')) {
      try {
        await configService.resetConfig();
        setNotionToken('');
        setImgbbKey('');
        if (onConfigUpdate) onConfigUpdate();
      } catch (error) {
        setError('Erreur lors de la réinitialisation');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-notion-gray-900">Configuration</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-notion-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-notion-gray-600" />
            </button>
          </div>

          {/* Contenu */}
          <div className="space-y-6">
            {/* Token Notion */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-notion-gray-700 mb-2">
                <Key size={16} />
                Token d'intégration Notion
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                  placeholder="secret_..."
                  className="w-full px-3 py-2 pr-10 border border-notion-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded"
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-notion-gray-500 mt-1">
                Requis pour accéder à vos pages Notion
              </p>
            </div>

            {/* Clé ImgBB */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-notion-gray-700 mb-2">
                <ImageIcon size={16} />
                Clé API ImgBB (optionnel)
              </label>
              <div className="relative">
                <input
                  type={showImgbbKey ? 'text' : 'password'}
                  value={imgbbKey}
                  onChange={(e) => setImgbbKey(e.target.value)}
                  placeholder="Votre clé API ImgBB"
                  className="w-full px-3 py-2 pr-10 border border-notion-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowImgbbKey(!showImgbbKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded"
                >
                  {showImgbbKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-notion-gray-500 mt-1">
                Pour uploader automatiquement les images
              </p>
            </div>

            {/* Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">Configuration sauvegardée avec succès!</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              Réinitialiser
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-notion-gray-600 hover:bg-notion-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={loading || (!notionToken && !imgbbKey)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${loading || (!notionToken && !imgbbKey)
                    ? 'bg-notion-gray-200 text-notion-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Sauvegarder
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}