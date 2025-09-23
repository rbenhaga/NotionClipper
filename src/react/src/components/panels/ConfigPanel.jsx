import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Key, Eye, EyeOff, Loader, Trash2, Shield, Save } from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';
import api from "../../services/api";

const API_URL = 'http://localhost:5000/api';

function ConfigPanel({ isOpen, onClose, onSave, config, showNotification }) {
  const [localConfig, setLocalConfig] = useState({
    ...config,
    notionToken: config.notionToken === 'configured' ? '' : config.notionToken,
    imgbbKey: config.imgbbKey === 'configured' ? '' : config.imgbbKey
  });
  const [showKeys, setShowKeys] = useState({ notion: false, imgbb: false });
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const response = await api.post('/clear-cache');
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
                value={localConfig.notionToken === 'configured' && !showKeys.notion 
                  ? '' 
                  : localConfig.notionToken || ''}
                onChange={(e) => setLocalConfig({ 
                  ...localConfig, 
                  notionToken: e.target.value 
                })}
                className="w-full pl-10 pr-12 py-2 border border-notion-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder={config.notionToken === 'configured' ? "(entrez pour modifier)" : "ntn..."}
                style={{
                  letterSpacing: showKeys.notion ? 'normal' : '0.1em',
                  fontSize: showKeys.notion ? '13px' : '16px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowKeys({ ...showKeys, notion: !showKeys.notion })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded transition-colors"
              >
                {showKeys.notion ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-notion-gray-500 mt-1">
              Trouvez votre token sur notion.so/my-integrations
            </p>
          </div>

          {/* ImgBB Key */}
          <div>
            <label className="block text-sm font-medium text-notion-gray-700 mb-2">
              Clé API ImgBB (optionnel)
            </label>
            <div className="relative">
              <ImageIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-notion-gray-400" />
              <input
                type={showKeys.imgbb ? 'text' : 'password'}
                value={localConfig.imgbbKey === 'configured' && !showKeys.imgbb 
                  ? '' 
                  : localConfig.imgbbKey || ''}
                onChange={(e) => setLocalConfig({ 
                  ...localConfig, 
                  imgbbKey: e.target.value 
                })}
                className="w-full pl-10 pr-12 py-2 border border-notion-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder={config.imgbbKey === 'configured' ? "(entrez pour modifier)" : "Votre clé API ImgBB"}
                style={{
                  letterSpacing: showKeys.imgbb ? 'normal' : '0.1em',
                  fontSize: showKeys.imgbb ? '13px' : '16px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowKeys({ ...showKeys, imgbb: !showKeys.imgbb })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-notion-gray-100 rounded transition-colors"
              >
                {showKeys.imgbb ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Section Gestion du cache */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-notion-gray-900 mb-3">Gestion du cache</h3>

            <div className="space-y-3">
              <button
                onClick={handleClearCache}
                disabled={clearingCache}
                className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {clearingCache ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      Vidage en cours...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Vider tout le cache
                    </>
                  )}
                </span>
                <span className="text-xs opacity-75">Libérer l'espace</span>
              </button>

              <div className="text-xs text-notion-gray-500 bg-notion-gray-50 rounded p-3">
                <p className="font-medium mb-1">À propos du cache :</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Stocke les pages Notion pour un accès rapide</li>
                  <li>Réduit les appels API et améliore les performances</li>
                  <li>Se reconstruit automatiquement après vidage</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Note sur la sécurité */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
            <p className="flex items-center gap-1">
              <Shield size={14} />
              <span className="font-medium">Sécurité :</span>
            </p>
            <p className="mt-1">
              Vos clés API sont chiffrées localement et ne sont jamais exposées dans le code source.
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

export default ConfigPanel;