import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Key, Eye, EyeOff, Loader, Trash2, Shield, Save,
    AlertCircle, CheckCircle, Database
} from 'lucide-react';

interface ConfigPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: any) => Promise<void>;
    config: {
        notionToken: string;
        [key: string]: any;
    };
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    onClearCache?: () => Promise<void>;
    validateNotionToken?: (token: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Panneau de configuration - 100% fidèle à l'app Electron
 */
export function ConfigPanel({
    isOpen,
    onClose,
    onSave,
    config,
    showNotification,
    onClearCache,
    validateNotionToken
}: ConfigPanelProps) {
    const [localConfig, setLocalConfig] = useState({
        ...config,
        notionToken: config?.notionToken === 'configured' ? '' : (config?.notionToken || ''),
        isTokenMasked: config?.notionToken === 'configured'
    });
    const [showKeys, setShowKeys] = useState({ notion: false });
    const [saving, setSaving] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    // Synchroniser localConfig avec les props
    useEffect(() => {
        setLocalConfig({
            ...config,
            notionToken: config?.notionToken === 'configured' ? '' : (config?.notionToken || ''),
            isTokenMasked: config?.notionToken === 'configured'
        });
    }, [config]);

    const handleClearCache = async () => {
        if (!onClearCache) return;

        setClearingCache(true);
        try {
            await onClearCache();
            showNotification('Cache vidé avec succès', 'success');
        } catch (error) {
            showNotification('Erreur lors du vidage du cache', 'error');
        } finally {
            setClearingCache(false);
        }
    };

    const validateToken = async (token: string) => {
        if (!token || !token.trim()) {
            setValidationResult({
                type: 'error',
                message: 'Veuillez entrer un token'
            });
            return false;
        }

        if (!validateNotionToken) {
            setValidationResult({
                type: 'success',
                message: 'Token enregistré'
            });
            return true;
        }

        setValidating(true);
        setValidationResult(null);

        try {
            const result = await validateNotionToken(token.trim());

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
        } catch (error: any) {
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
        console.log('💾 ConfigPanel handleSave called with:', localConfig);
        
        // Si le token a changé, valider d'abord
        if (localConfig.notionToken && localConfig.notionToken !== config.notionToken) {
            console.log('🔍 Token changed, validating...');
            const isValid = await validateToken(localConfig.notionToken);
            if (!isValid) {
                console.log('❌ Token validation failed');
                return;
            }
            console.log('✅ Token validation successful');
        }

        setSaving(true);
        try {
            console.log('💾 Calling onSave with config:', localConfig);
            await onSave({
                ...localConfig,
                onboardingCompleted: true // Marquer l'onboarding comme terminé
            });
            showNotification('Configuration sauvegardée', 'success');
            onClose();
        } catch (error) {
            console.error('❌ Error saving config:', error);
            showNotification('Erreur sauvegarde config', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center"
            style={{ zIndex: 9999 }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - EXACTEMENT comme app Electron */}
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
                                        type={showKeys.notion ? "text" : "password"}
                                        value={localConfig.notionToken}
                                        onChange={(e) => {
                                            setLocalConfig({ ...localConfig, notionToken: e.target.value });
                                            setValidationResult(null);
                                        }}
                                        placeholder={localConfig.isTokenMasked ? "Token enregistré" : "ntn..."}
                                        className="w-full px-3 py-2 pr-10 text-xs border border-gray-200 rounded-lg 
                                                 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKeys({ ...showKeys, notion: !showKeys.notion })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showKeys.notion ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>

                                {/* Validation Result - EXACTEMENT comme app */}
                                <AnimatePresence>
                                    {validationResult && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className={`mt-2 px-3 py-2 rounded-lg flex items-center gap-2 text-xs ${
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

                            {/* Bouton de test du token - EXACTEMENT comme app */}
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
                                        <Loader size={14} className="animate-spin" />
                                        <span>Vérification...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={14} />
                                        <span>Vérifier le token</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Cache section - si onClearCache fourni */}
                    {onClearCache && (
                        <div className="pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Trash2 size={16} className="text-gray-400" />
                                <h3 className="text-sm font-semibold text-gray-900">Cache</h3>
                            </div>

                            <button
                                onClick={handleClearCache}
                                disabled={clearingCache}
                                className="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 
                                         bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg 
                                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                         flex items-center gap-2"
                            >
                                {clearingCache ? (
                                    <>
                                        <Loader size={14} className="animate-spin" />
                                        <span>Vidage en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        <span>Vider le cache</span>
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-gray-500 mt-2">
                                Supprime les données en cache et recharge l'application
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer - EXACTEMENT comme app */}
                <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 
                                 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 
                                 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader size={14} className="animate-spin" />
                                <span>Sauvegarde...</span>
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                <span>Sauvegarder</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}