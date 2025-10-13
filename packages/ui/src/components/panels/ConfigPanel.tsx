import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Eye, EyeOff, Loader, Trash2, Save,
    AlertCircle, CheckCircle, Database, RefreshCw
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
    onResetApp?: () => Promise<void>;
    validateNotionToken?: (token: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * ConfigPanel - Design moderne amélioré style Notion
 * - Cache toujours visible, redémarre l'app avec onboarding
 * - Design épuré et moderne
 * - Meilleure hiérarchie visuelle
 */
export function ConfigPanel({
    isOpen,
    onClose,
    onSave,
    config,
    showNotification,
    onClearCache,
    onResetApp,
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
        setClearingCache(true);
        try {
            // ✅ Utiliser la fonction de reset complet
            if (onResetApp) {
                await onResetApp();
                // Fermer le panel immédiatement car l'onboarding va s'afficher
                onClose();
            } else {
                // Fallback vers l'ancienne méthode
                if (onClearCache) {
                    await onClearCache();
                }

                // Réinitialiser l'onboarding pour redémarrer l'app
                await onSave({
                    ...localConfig,
                    onboardingCompleted: false // ⭐ Clé : réinitialiser l'onboarding
                });

                showNotification('Cache vidé. L\'application va redémarrer...', 'success');

                // Fermer le panel et laisser l'app se réinitialiser
                setTimeout(() => {
                    onClose();
                    window.location.reload(); // Force le reload pour relancer l'onboarding
                }, 1000);
            }
        } catch (error) {
            showNotification('Erreur lors du vidage du cache', 'error');
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
                    message: '✓ Connexion à Notion établie'
                });
                return true;
            } else {
                setValidationResult({
                    type: 'error',
                    message: result.error || 'Token invalide'
                });
                return false;
            }
        } catch (error: any) {
            setValidationResult({
                type: 'error',
                message: 'Erreur de connexion'
            });
            return false;
        } finally {
            setValidating(false);
        }
    };

    const handleSave = async () => {
        // Si le token a changé, valider d'abord
        if (localConfig.notionToken && localConfig.notionToken !== config.notionToken) {
            const isValid = await validateToken(localConfig.notionToken);
            if (!isValid) {
                return;
            }
        }

        setSaving(true);
        try {
            await onSave({
                ...localConfig,
                onboardingCompleted: true
            });
            showNotification('Configuration sauvegardée', 'success');
            onClose();
        } catch (error) {
            console.error('❌ Error saving config:', error);
            showNotification('Erreur de sauvegarde', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center"
            style={{ zIndex: 99999 }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-2xl shadow-2xl w-[580px] max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Design moderne amélioré */}
                <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-br from-gray-50/50 to-white">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">Paramètres</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-all duration-200"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Content - Design épuré et moderne */}
                <div className="px-7 py-6 space-y-6 overflow-y-auto max-h-[calc(90vh-160px)] notion-scrollbar-vertical">

                    {/* Section 1 : Notion Integration - Design amélioré */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                <Database size={16} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Connexion Notion</h3>
                                <p className="text-xs text-gray-500">Configurez votre intégration</p>
                            </div>
                        </div>

                        <div className="space-y-3 pl-10">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Token d'intégration
                                </label>
                                <div className="relative group">
                                    <input
                                        type={showKeys.notion ? "text" : "password"}
                                        value={localConfig.notionToken}
                                        onChange={(e) => {
                                            setLocalConfig({ ...localConfig, notionToken: e.target.value });
                                            setValidationResult(null);
                                        }}
                                        placeholder={localConfig.isTokenMasked ? "••••••••••••••••" : "ntn..."}
                                        className="w-full px-4 py-2.5 pr-11 text-sm border border-gray-200 rounded-xl 
                                                 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
                                                 transition-all duration-200 bg-gray-50/50 focus:bg-white
                                                 placeholder:text-gray-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKeys({ ...showKeys, notion: !showKeys.notion })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 
                                                 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                    >
                                        {showKeys.notion ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>

                                {/* Validation Result - Design moderne */}
                                <AnimatePresence>
                                    {validationResult && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className={`px-3.5 py-2.5 rounded-xl flex items-start gap-2.5 text-sm ${validationResult.type === 'success'
                                                ? 'bg-green-50 text-green-800 border border-green-100'
                                                : 'bg-red-50 text-red-800 border border-red-100'
                                                }`}
                                        >
                                            {validationResult.type === 'success' ? (
                                                <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                            )}
                                            <span className="text-sm leading-relaxed">{validationResult.message}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex items-start gap-2 mt-2.5">
                                    <AlertCircle size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Obtenez votre token sur{' '}
                                        <a
                                            href="https://www.notion.so/my-integrations"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                            notion.so/my-integrations
                                        </a>
                                    </p>
                                </div>
                            </div>

                            {/* Bouton de validation - Design moderne */}
                            <button
                                onClick={() => validateToken(localConfig.notionToken)}
                                disabled={validating || !localConfig.notionToken}
                                className="px-4 py-2 text-sm font-medium text-gray-700 
                                         bg-white hover:bg-gray-50 border border-gray-200 rounded-xl 
                                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                                         flex items-center gap-2 shadow-sm hover:shadow"
                            >
                                {validating ? (
                                    <>
                                        <Loader size={16} className="animate-spin" />
                                        <span>Vérification...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={16} />
                                        <span>Vérifier la connexion</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Séparateur visuel moderne */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-100"></div>
                        </div>
                    </div>

                    {/* Section 2 : Cache - Design moderne avec warning */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                                <RefreshCw size={16} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Réinitialisation</h3>
                                <p className="text-xs text-gray-500">Vider le cache et redémarrer</p>
                            </div>
                        </div>

                        <div className="space-y-3 pl-10">
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <div className="flex gap-3">
                                    <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-2">
                                        <p className="text-sm text-amber-900 font-medium">
                                            Réinitialiser l'application
                                        </p>
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            Vide le cache local et redémarre l'application.
                                            Recommandé en cas de problèmes de synchronisation.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleClearCache}
                                disabled={clearingCache}
                                className="px-4 py-2.5 text-sm font-medium text-amber-700 
                                         bg-white hover:bg-amber-50 border border-amber-200 rounded-xl 
                                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                                         flex items-center gap-2 shadow-sm hover:shadow group"
                            >
                                {clearingCache ? (
                                    <>
                                        <Loader size={16} className="animate-spin" />
                                        <span>Réinitialisation en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                                        <span>Vider le cache et redémarrer</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer - Design moderne amélioré */}
                <div className="px-7 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 
                                 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl 
                                 transition-all duration-200 shadow-sm hover:shadow"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 text-sm font-medium text-white 
                                 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700
                                 rounded-xl transition-all duration-200 disabled:opacity-50 
                                 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-lg"
                    >
                        {saving ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                <span>Sauvegarde...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Enregistrer</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}