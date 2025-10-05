import React, { useState } from 'react';
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
        previewPageId?: string;
        [key: string]: any;
    };
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
    onClearCache?: () => Promise<void>;
    validateNotionToken?: (token: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Panneau de configuration
 * Permet de configurer le token Notion et autres paramètres
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
        notionToken: config.notionToken === 'configured' ? '' : config.notionToken,
        isTokenMasked: config.notionToken === 'configured'
    });
    const [showKeys, setShowKeys] = useState({ notion: false });
    const [saving, setSaving] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

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
        // Si le token a changé, valider d'abord
        if (localConfig.notionToken && localConfig.notionToken !== config.notionToken) {
            const isValid = await validateToken(localConfig.notionToken);
            if (!isValid) return;
        }

        setSaving(true);
        try {
            await onSave(localConfig);
            showNotification('Configuration sauvegardée', 'success');
            onClose();
        } catch (error) {
            showNotification('Erreur lors de la sauvegarde', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                                <Shield size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800">Configuration</h2>
                                <p className="text-sm text-gray-500">Gérez vos paramètres et connexions</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Notion Configuration */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Database size={18} className="text-gray-700" />
                                <h3 className="text-lg font-semibold text-gray-800">Connexion Notion</h3>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Token d'intégration Notion
                                </label>
                                <div className="relative">
                                    <input
                                        type={showKeys.notion ? "text" : "password"}
                                        value={localConfig.notionToken}
                                        onChange={(e) => {
                                            setLocalConfig({ ...localConfig, notionToken: e.target.value });
                                            setValidationResult(null);
                                        }}
                                        placeholder={localConfig.isTokenMasked ? "Token enregistré" : "secret_..."}
                                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKeys({ ...showKeys, notion: !showKeys.notion })}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                    >
                                        {showKeys.notion ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {/* Validation Result */}
                                {validationResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`mt-2 p-3 rounded-lg flex items-center gap-2 ${validationResult.type === 'success'
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-red-50 text-red-700'
                                            }`}
                                    >
                                        {validationResult.type === 'success' ? (
                                            <CheckCircle size={16} />
                                        ) : (
                                            <AlertCircle size={16} />
                                        )}
                                        <span className="text-sm">{validationResult.message}</span>
                                    </motion.div>
                                )}

                                <button
                                    onClick={() => validateToken(localConfig.notionToken)}
                                    disabled={validating || !localConfig.notionToken}
                                    className="mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    {validating ? (
                                        <>
                                            <Loader size={16} className="animate-spin" />
                                            Vérification...
                                        </>
                                    ) : (
                                        <>
                                            <Key size={16} />
                                            Tester la connexion
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>💡 Comment obtenir un token ?</strong>
                                </p>
                                <ol className="mt-2 text-sm text-blue-700 space-y-1 ml-4 list-decimal">
                                    <li>Allez sur <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="underline">notion.so/my-integrations</a></li>
                                    <li>Créez une nouvelle intégration</li>
                                    <li>Copiez le token secret</li>
                                    <li>Partagez vos pages avec l'intégration</li>
                                </ol>
                            </div>
                        </div>

                        {/* Cache Management */}
                        {onClearCache && (
                            <div className="space-y-4 pt-6 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                    <Trash2 size={18} className="text-gray-700" />
                                    <h3 className="text-lg font-semibold text-gray-800">Maintenance</h3>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">Vider le cache</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Supprime les données en cache et recharge les pages
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleClearCache}
                                        disabled={clearingCache}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        {clearingCache ? (
                                            <>
                                                <Loader size={16} className="animate-spin" />
                                                Nettoyage...
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
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader size={16} className="animate-spin" />
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
            </motion.div>
        </AnimatePresence>
    );
}