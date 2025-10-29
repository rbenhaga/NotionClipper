// packages/ui/src/components/panels/ConfigPanel.tsx
// ✅ CORRECTIONS COMPLÈTES:
// - Plus de rechargement infini (useEffect optimisé)
// - Reset cache fait un clean total et relance onboarding
// - Ne plus afficher le token (masqué par défaut)
// - Design choix du thème amélioré
// - Déconnexion du compte Notion

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Loader, Trash2, LogOut,
    AlertCircle, CheckCircle, Database, RefreshCw,
    Sun, Moon, Monitor, Palette
} from 'lucide-react';

import { Theme } from '../../hooks/ui/useTheme';

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
    theme?: Theme;
    onThemeChange?: (theme: Theme) => void;
}

export function ConfigPanel({
    isOpen,
    onClose,
    onSave,
    config,
    showNotification,
    onClearCache,
    onResetApp,
    theme = 'system',
    onThemeChange
}: ConfigPanelProps) {
    const [localConfig, setLocalConfig] = useState({
        ...config,
        notionToken: '' // ✅ Toujours vide par défaut (masqué)
    });
    const [clearingCache, setClearingCache] = useState(false);

    // ✅ Ref pour éviter les re-renders infinis
    const initializedRef = useRef(false);

    // ✅ CORRECTION: Synchroniser UNIQUEMENT au montage
    useEffect(() => {
        if (!initializedRef.current && isOpen) {
            initializedRef.current = true;
            setLocalConfig({
                ...config,
                notionToken: '' // Masquer le token par défaut
            });
        }
    }, [isOpen]); // ✅ Seulement quand le panel s'ouvre

    // ✅ Déconnexion du compte Notion
    const handleDisconnect = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir vous déconnecter de Notion ? Cela supprimera toutes vos données locales et relancera l\'onboarding.')) {
            return;
        }

        setClearingCache(true);
        try {
            if (onResetApp) {
                await onResetApp();
                showNotification('Déconnecté avec succès. L\'application va redémarrer...', 'success');
                setTimeout(() => {
                    onClose();
                    window.location.reload();
                }, 1500);
            }
        } catch (error) {
            showNotification('Erreur lors de la déconnexion', 'error');
        } finally {
            setClearingCache(false);
        }
    };

    // ✅ Reset cache seulement (ne déconnecte PAS)
    const handleClearCacheOnly = async () => {
        if (!window.confirm('Vider le cache local ? (Les pages, favoris et suggestions seront rechargés)')) {
            return;
        }

        setClearingCache(true);
        try {
            if (onClearCache) {
                await onClearCache();
                showNotification('Cache vidé avec succès', 'success');
            }
        } catch (error) {
            showNotification('Erreur lors du vidage du cache', 'error');
        } finally {
            setClearingCache(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configuration</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                        {/* Section 1: Compte Notion */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center shadow-sm">
                                    <Database size={16} className="text-white dark:text-gray-900" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Compte Notion</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {config.notionToken ? 'Connecté' : 'Non connecté'}
                                    </p>
                                </div>
                            </div>

                            {/* ✅ Afficher le statut de connexion au lieu du token */}
                            {config.notionToken ? (
                                <div className="pl-10 space-y-3">
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-xl">
                                        <div className="flex gap-3">
                                            <CheckCircle size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-green-900 dark:text-green-200 font-medium">
                                                    Connecté à Notion
                                                </p>
                                                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                                    Votre compte est actif et synchronisé
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ✅ Bouton de déconnexion */}
                                    <button
                                        onClick={handleDisconnect}
                                        disabled={clearingCache}
                                        className="px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-300
                                                 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 
                                                 border border-red-200 dark:border-red-700 rounded-xl 
                                                 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                                                 flex items-center gap-2 shadow-sm hover:shadow group"
                                    >
                                        {clearingCache ? (
                                            <>
                                                <Loader size={16} className="animate-spin" />
                                                <span>Déconnexion...</span>
                                            </>
                                        ) : (
                                            <>
                                                <LogOut size={16} />
                                                <span>Se déconnecter</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="pl-10">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        Veuillez vous connecter à Notion via l'onboarding
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Section 2: Apparence - Design amélioré */}
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm">
                                    <Palette size={16} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Apparence</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Personnalisez l'interface</p>
                                </div>
                            </div>

                            <div className="pl-10">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Thème de l'interface
                                </label>
                                
                                {/* ✅ Design moderne avec cards cliquables */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'light', icon: Sun, label: 'Clair' },
                                        { value: 'dark', icon: Moon, label: 'Sombre' },
                                        { value: 'system', icon: Monitor, label: 'Auto' }
                                    ].map(({ value, icon: Icon, label }) => (
                                        <button
                                            key={value}
                                            onClick={async () => {
                                                const newTheme = value as Theme;
                                                onThemeChange?.(newTheme);
                                                try {
                                                    await onSave({ ...localConfig, theme: newTheme });
                                                    showNotification('Thème appliqué', 'success');
                                                } catch (error) {
                                                    console.error('Erreur sauvegarde thème:', error);
                                                }
                                            }}
                                            className={`
                                                p-4 rounded-xl border-2 transition-all duration-200
                                                flex flex-col items-center gap-2
                                                ${theme === value
                                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }
                                            `}
                                        >
                                            <Icon size={24} className={theme === value ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'} />
                                            <span className={`text-sm font-medium ${theme === value ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Cache */}
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                                    <RefreshCw size={16} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cache local</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Vider les données temporaires</p>
                                </div>
                            </div>

                            <div className="pl-10">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl mb-3">
                                    <div className="flex gap-3">
                                        <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
                                                Vider le cache uniquement
                                            </p>
                                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                                Supprime les pages et suggestions en cache. Vous restez connecté.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleClearCacheOnly}
                                    disabled={clearingCache}
                                    className="px-4 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300
                                             bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 
                                             border border-blue-200 dark:border-blue-700 rounded-xl 
                                             transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                                             flex items-center gap-2 shadow-sm hover:shadow"
                                >
                                    {clearingCache ? (
                                        <>
                                            <Loader size={16} className="animate-spin" />
                                            <span>Nettoyage...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={16} />
                                            <span>Vider le cache</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            Fermer
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}