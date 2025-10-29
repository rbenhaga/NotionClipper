// packages/ui/src/components/panels/ConfigPanel.tsx
// 🎨 Design System Notion/Apple - Ultra épuré et performant
import { useState } from 'react';
import { X, Loader, Moon, Sun, Monitor, LogOut, Trash2, CheckCircle2 } from 'lucide-react';

interface ConfigPanelProps {
    isOpen: boolean;
    onClose: () => void;
    config: {
        notionToken?: string;
        userName?: string;
        userEmail?: string;
        userAvatar?: string;
        theme?: 'light' | 'dark' | 'system';
        [key: string]: any;
    };
    theme?: 'light' | 'dark' | 'system';
    onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
    onClearCache?: () => Promise<void>;
    onDisconnect?: () => Promise<void>;
    showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function ConfigPanel({
    isOpen,
    onClose,
    config,
    theme = 'system',
    onThemeChange,
    onClearCache,
    onDisconnect,
    showNotification
}: ConfigPanelProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionType, setActionType] = useState<'cache' | 'disconnect' | null>(null);
    const [userInfo, setUserInfo] = useState<{
        name?: string;
        email?: string;
        avatar?: string;
    } | null>(null);
    const [loadingUserInfo, setLoadingUserInfo] = useState(false);

    const handleClearCache = async () => {
        setActionType('cache');
        setIsProcessing(true);
        try {
            await onClearCache?.();
            // ✅ Pas de notification ici - App.tsx s'en charge déjà
        } catch (error) {
            // ✅ Notification d'erreur uniquement en cas d'échec
            showNotification?.('Erreur lors du vidage du cache', 'error');
        } finally {
            setIsProcessing(false);
            setActionType(null);
        }
    };

    const handleDisconnect = async () => {
        setActionType('disconnect');
        setIsProcessing(true);
        try {
            await onDisconnect?.();
            // ✅ Pas de notification ici - App.tsx s'en charge déjà
            onClose();
        } catch (error) {
            // ✅ Notification d'erreur uniquement en cas d'échec
            showNotification?.('Erreur lors de la déconnexion', 'error');
            setIsProcessing(false);
            setActionType(null);
        }
    };

    if (!isOpen) return null;

    const isConnected = !!config.notionToken;
    const themeOptions = [
        { value: 'light' as const, icon: Sun, label: 'Clair' },
        { value: 'dark' as const, icon: Moon, label: 'Sombre' },
        { value: 'system' as const, icon: Monitor, label: 'Auto' }
    ];

    return (
        <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#191919] w-full max-w-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header minimaliste */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                        Paramètres
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                    >
                        <X size={18} className="text-gray-400 dark:text-gray-500" strokeWidth={2} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-8">
                    {/* Section Connexion */}
                    <div className="space-y-4">
                        <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                            Connexion
                        </h3>

                        <div className={`
                            relative p-4 rounded-xl border transition-all duration-200
                            ${isConnected
                                ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                            }
                        `}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 p-1.5">
                                    <img
                                        src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                                        alt="Notion"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                                            Notion
                                        </p>
                                        {isConnected && (
                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                <span className="text-[11px] font-medium text-green-700 dark:text-green-400">
                                                    Connecté
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                                        {isConnected ? 'Accès workspace autorisé' : 'Non connecté'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section Apparence */}
                    <div className="space-y-4">
                        <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                            Apparence
                        </h3>

                        <div className="grid grid-cols-3 gap-2">
                            {themeOptions.map(({ value, icon: Icon, label }) => {
                                const isActive = theme === value;
                                return (
                                    <button
                                        key={value}
                                        onClick={() => onThemeChange?.(value)}
                                        className={`
                                            relative p-3 rounded-xl border transition-all duration-200
                                            flex flex-col items-center gap-2 group
                                            ${isActive
                                                ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white shadow-sm'
                                                : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }
                                        `}
                                    >
                                        <Icon
                                            size={20}
                                            className={
                                                isActive
                                                    ? 'text-white dark:text-gray-900'
                                                    : 'text-gray-600 dark:text-gray-400'
                                            }
                                            strokeWidth={2}
                                        />
                                        <span className={`text-[12px] font-medium ${isActive
                                            ? 'text-white dark:text-gray-900'
                                            : 'text-gray-700 dark:text-gray-300'
                                            }`}>
                                            {label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section Actions */}
                    {isConnected && (
                        <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                            {/* Vider le cache */}
                            <button
                                onClick={handleClearCache}
                                disabled={isProcessing}
                                className="w-full group"
                            >
                                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                        {isProcessing && actionType === 'cache' ? (
                                            <Loader size={16} className="text-gray-600 dark:text-gray-400 animate-spin" strokeWidth={2} />
                                        ) : (
                                            <Trash2 size={16} className="text-gray-600 dark:text-gray-400" strokeWidth={2} />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                                            {isProcessing && actionType === 'cache' ? 'Nettoyage...' : 'Vider le cache'}
                                        </p>
                                        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            Supprime les données temporaires
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Déconnexion */}
                            <button
                                onClick={handleDisconnect}
                                disabled={isProcessing}
                                className="w-full group"
                            >
                                <div className="flex items-center gap-3 p-3 rounded-xl border border-red-200 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                        {isProcessing && actionType === 'disconnect' ? (
                                            <Loader size={16} className="text-red-600 dark:text-red-400 animate-spin" strokeWidth={2} />
                                        ) : (
                                            <LogOut size={16} className="text-red-600 dark:text-red-400" strokeWidth={2} />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-[14px] font-medium text-red-900 dark:text-red-100">
                                            {isProcessing && actionType === 'disconnect' ? 'Déconnexion...' : 'Se déconnecter'}
                                        </p>
                                        <p className="text-[12px] text-red-600 dark:text-red-400 mt-0.5">
                                            Supprime toutes les données locales
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer avec version */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center">
                        Notion Clipper Pro · Version 1.0.0
                    </p>
                </div>
            </div>
        </div>
    );
}