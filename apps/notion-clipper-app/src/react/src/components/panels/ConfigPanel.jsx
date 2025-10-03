import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Key, Eye, EyeOff, Loader, Trash2, Shield, Save, 
  AlertCircle, CheckCircle, Database
} from 'lucide-react';

export default function ConfigPanel({ isOpen, onClose, onSave, config, showNotification }) {
  const [localConfig, setLocalConfig] = useState({
    ...config,
    notionToken: config.notionToken === 'configured' ? '' : config.notionToken,
    isTokenMasked: config.notionToken === 'configured'
  });
  const [showKeys, setShowKeys] = useState({ notion: false });
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const response = await window.electronAPI?.clearCache?.();
      if (response?.success) {
        showNotification('Cache vidé avec succès', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      showNotification('Erreur lors du vidage du cache', 'error');
    } finally {
      setClearingCache(false);
    }
  };

  const validateToken = async (token) => {
    if (!token || !token.trim()) {
      setValidationResult({
        type: 'error',
        message: 'Veuillez entrer un token'
      });
      return false;
    }

    setValidating(true);
    setValidationResult(null);
    
    try {
      // Vérification via l'API Electron
      if (window.electronAPI?.verifyToken) {
        const result = await window.electronAPI.verifyToken(token.trim());
        
        if (result.success) {
          setValidationResult({
            type: 'success',
            message: 'Token valide ! Connexion à Notion réussie.'
          });
          return true;
        } else {
          setValidationResult({
            type: 'error',
            message: result.error || 'Token invalide. Vérifiez votre token et réessayez.'
          });
          return false;
        }
      }
    } catch (error) {
      setValidationResult({
        type: 'error',
        message: 'Erreur de connexion. Vérifiez votre connexion internet.'
      });
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    // Si le token a été modifié, le valider d'abord
    if (localConfig.notionToken && localConfig.notionToken !== config.notionToken) {
      const isValid = await validateToken(localConfig.notionToken);
      if (!isValid) {
        return; // Ne pas sauvegarder si le token est invalide
      }
    }

    setSaving(true);
    try {
      await onSave(localConfig);
      showNotification('Configuration sauvegardée', 'success');
      onClose();
    } catch (error) {
      showNotification('Erreur sauvegarde config', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose} // Ferme en cliquant sur le backdrop
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Empêche la fermeture en cliquant sur la modal
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
              <Shield size={18} className="text-gray-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Paramètres</h2>
              <p className="text-xs text-gray-500">Configuration de l'application</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-8 overflow-y-auto max-h-[calc(85vh-180px)] notion-scrollbar-vertical">
          {/* Section : Notion */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Database size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Intégration Notion</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Token d'intégration
                </label>
                <div className="relative">
                  <input
                    type={showKeys.notion ? 'text' : 'password'}
                    value={localConfig.notionToken || ''}
                    onChange={(e) => {
                      setLocalConfig({ 
                        ...localConfig, 
                        notionToken: e.target.value,
                        isTokenMasked: false
                      });
                      // Réinitialiser le résultat de validation quand l'utilisateur tape
                      if (validationResult) {
                        setValidationResult(null);
                      }
                    }}
                    className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono bg-gray-50"
                    placeholder={localConfig.isTokenMasked ? '(cliquez pour modifier)' : 'ntn_...'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys({ ...showKeys, notion: !showKeys.notion })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {showKeys.notion ? 
                      <EyeOff size={14} className="text-gray-500" /> : 
                      <Eye size={14} className="text-gray-500" />
                    }
                  </button>
                </div>
                
                {/* Message de validation */}
                <AnimatePresence>
                  {validationResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`mt-2 p-3 rounded-lg flex items-center gap-2 ${
                        validationResult.type === 'success' 
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {validationResult.type === 'success' ? (
                        <CheckCircle size={14} className="flex-shrink-0" />
                      ) : (
                        <AlertCircle size={14} className="flex-shrink-0" />
                      )}
                      <span className="text-xs">{validationResult.message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Créez votre token sur notion.so/my-integrations
                </p>
              </div>

              {/* Bouton de test du token */}
              <button
                onClick={() => validateToken(localConfig.notionToken)}
                disabled={validating || !localConfig.notionToken}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 
                         bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                {validating ? (
                  <>
                    <Loader size={12} className="animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle size={12} />
                    Tester le token
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section : Cache */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Gestion du cache</h3>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Vider le cache
                  </p>
                  <p className="text-xs text-gray-500">
                    Supprime les pages en cache et force une nouvelle synchronisation
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleClearCache}
                disabled={clearingCache}
                className="w-full px-4 py-2.5 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-red-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white border border-gray-200 rounded-xl transition-all"
          >
            Annuler
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving || validating}
            className="px-6 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
          >
            {saving ? (
              <>
                <Loader size={14} className="animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save size={14} />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </motion.div>
      
      <style>{`
        .notion-scrollbar-vertical {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db #f9fafb;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar {
          width: 8px;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-track {
          background: #f9fafb;
          border-radius: 4px;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 4px;
          border: 2px solid #f9fafb;
          transition: background-color 0.2s;
        }
        
        .notion-scrollbar-vertical:hover::-webkit-scrollbar-thumb {
          background-color: #9ca3af;
        }
        
        .notion-scrollbar-vertical::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280;
        }
      `}</style>
    </div>
  );
}