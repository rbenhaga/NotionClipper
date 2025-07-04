// src/react/src/components/settings/ConfigPanel.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Key, Save, Loader, Eye, EyeOff, Image as ImageIcon, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default function ConfigPanel({ isOpen, onClose, onSave, config, showNotification }) {
  const [localConfig, setLocalConfig] = useState(config);
  const [showKeys, setShowKeys] = useState({ notion: false, imgbb: false });
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const response = await axios.post(`${API_URL}/clear_cache`);
      if (response.data.success) {
        showNotification('Cache vidé avec succès', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      showNotification('Erreur lors du vidage du cache', 'error');
    } finally {
      setClearingCache(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localConfig);
      onClose();
    } catch (error) {
      showNotification('Erreur sauvegarde config', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div className="bg-white rounded-notion p-6 w-[500px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-notion-gray-900">Paramètres</h2>
          <button onClick={onClose} className="p-1 hover:bg-notion-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Token Notion avec affichage amélioré */}
          <div>
            <label className="block text-sm font-medium text-notion-gray-700 mb-2">
              Token d'intégration Notion *
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-notion-gray-400" />
              <input
                type={showKeys.notion ? 'text' : 'password'}
                value={localConfig.notionToken}
                onChange={(e) => setLocalConfig({ ...localConfig, notionToken: e.target.value })}
                placeholder="secret_..."
                className="w-full pl-10 pr-10 py-2 border border-notion-gray-200 rounded-notion text-sm focus:outline-none focus:ring-2 focus:ring-notion-gray-300"
              />
              <button
                onClick={() => setShowKeys({ ...showKeys, notion: !showKeys.notion })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded"
              >
                {showKeys.notion ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Clé ImgBB */}
          <div>
            <label className="block text-sm font-medium text-notion-gray-700 mb-2">
              Clé API ImgBB (optionnel)
            </label>
            <div className="relative">
              <ImageIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-notion-gray-400" />
              <input
                type={showKeys.imgbb ? 'text' : 'password'}
                value={localConfig.imgbbKey}
                onChange={(e) => setLocalConfig({ ...localConfig, imgbbKey: e.target.value })}
                placeholder="Pour uploader des images"
                className="w-full pl-10 pr-10 py-2 border border-notion-gray-200 rounded-notion text-sm focus:outline-none focus:ring-2 focus:ring-notion-gray-300"
              />
              <button
                onClick={() => setShowKeys({ ...showKeys, imgbb: !showKeys.imgbb })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded"
              >
                {showKeys.imgbb ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Bouton vider le cache */}
          <div className="pt-4 border-t border-notion-gray-200">
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-notion text-sm font-medium hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {clearingCache ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  Vidage en cours...
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Vider le cache
                </>
              )}
            </button>
            <p className="text-xs text-notion-gray-500 mt-2">
              Efface toutes les pages en cache. Utile en cas de problème.
            </p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-notion-gray-200 rounded-md text-sm font-medium hover:bg-notion-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !localConfig.notionToken}
            className="flex-1 px-4 py-2 bg-notion-gray-900 text-white rounded-md text-sm font-medium hover:bg-notion-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader size={14} className="animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save size={14} />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}