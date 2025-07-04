// src/react/src/components/settings/ConfigPanel.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Save, Eye, EyeOff, Key, Database, 
  Image as ImageIcon, Shield, Trash2, 
  RefreshCw, CheckCircle, AlertCircle, Settings 
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function ConfigPanel({ config, onSave, onClose, onClearCache }) {
  const [localConfig, setLocalConfig] = useState({ ...config });
  const [showNotionKey, setShowNotionKey] = useState(false);
  const [showImgbbKey, setShowImgbbKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setValidationResult(null);
    
    try {
      // Valider le token Notion
      const response = await axios.post(`${API_URL}/validate-notion-token`, {
        token: localConfig.notionToken
      });
      
      if (response.data.valid) {
        await onSave(localConfig);
        setValidationResult({
          type: 'success',
          message: 'Configuration sauvegardée avec succès'
        });
        
        // Fermer après un délai
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setValidationResult({
          type: 'error',
          message: 'Token Notion invalide'
        });
      }
    } catch (error) {
      setValidationResult({
        type: 'error',
        message: 'Erreur lors de la sauvegarde'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await onClearCache();
      setValidationResult({
        type: 'success',
        message: 'Cache vidé avec succès'
      });
    } catch (error) {
      setValidationResult({
        type: 'error',
        message: 'Erreur lors du vidage du cache'
      });
    } finally {
      setClearingCache(false);
    }
  };

  // Fonction pour masquer partiellement une clé API
  const maskApiKey = (key) => {
    if (!key) return '';
    if (key.length <= 10) return '••••••';
    return key.substring(0, 6) + '••••••';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Settings size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Notion Token */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Database size={16} />
              Token d'intégration Notion
            </label>
            <div className="relative">
              <input
                type={showNotionKey ? "text" : "password"}
                value={localConfig.notionToken}
                onChange={(e) => setLocalConfig({ ...localConfig, notionToken: e.target.value })}
                placeholder="secret_..."
                className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowNotionKey(!showNotionKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
              >
                {showNotionKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Clé actuelle : {maskApiKey(config.notionToken)}
            </p>
          </div>

          {/* ImgBB API Key */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <ImageIcon size={16} />
              Clé API ImgBB
            </label>
            <div className="relative">
              <input
                type={showImgbbKey ? "text" : "password"}
                value={localConfig.imgbbApiKey}
                onChange={(e) => setLocalConfig({ ...localConfig, imgbbApiKey: e.target.value })}
                placeholder="Votre clé API ImgBB"
                className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowImgbbKey(!showImgbbKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
              >
                {showImgbbKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Clé actuelle : {maskApiKey(config.imgbbApiKey)}
            </p>
          </div>

          {/* Security info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield size={20} className="text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Sécurité des clés API
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Vos clés API sont chiffrées et stockées de manière sécurisée. 
                  Elles ne sont jamais exposées dans le code source ou transmises 
                  à des services tiers.
                </p>
              </div>
            </div>
          </div>

          {/* Cache management */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Gestion du cache
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Vider le cache
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Supprime toutes les données en cache pour forcer un rafraîchissement
                  </p>
                </div>
                <button
                  onClick={handleClearCache}
                  disabled={clearingCache}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {clearingCache ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Vidage...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Vider
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Validation result */}
          {validationResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg flex items-center gap-3 ${
                validationResult.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {validationResult.type === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span className="text-sm">{validationResult.message}</span>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save size={16} />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ConfigPanel;