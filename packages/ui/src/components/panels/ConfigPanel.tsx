// packages/ui/src/components/panels/ConfigPanel.tsx
// 🎨 Apple/Notion Design System - Rigorous & Minimal
import { useState } from 'react';
import { X, Loader, Moon, Sun, Monitor, LogOut, Trash2, Globe, Check } from 'lucide-react';
import { useTranslation, type Locale } from '@notion-clipper/i18n';

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
    const { t, locale, setLocale } = useTranslation();
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionType, setActionType] = useState<'cache' | 'disconnect' | null>(null);

    const handleClearCache = async () => {
        setActionType('cache');
        setIsProcessing(true);
        try {
            await onClearCache?.();
        } catch (error) {
            showNotification?.(t('config.clearCacheError'), 'error');
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
            onClose();
        } catch (error) {
            showNotification?.(t('config.disconnectError'), 'error');
            setIsProcessing(false);
            setActionType(null);
        }
    };

    const handleLanguageChange = async (newLocale: Locale) => {
        setLocale(newLocale);
        setTimeout(() => {
            showNotification?.(t('config.languageChanged'), 'success');
        }, 100);
    };

    if (!isOpen) return null;

    const isConnected = !!config.notionToken;

    const themeOptions = [
        { value: 'light' as const, icon: Sun, label: t('config.light') },
        { value: 'dark' as const, icon: Moon, label: t('config.dark') },
        { value: 'system' as const, icon: Monitor, label: t('config.auto') }
    ];

    const languageOptions = [
        { value: 'en' as Locale, label: 'English', native: 'English' },
        { value: 'fr' as Locale, label: 'French', native: 'Français' },
        { value: 'es' as Locale, label: 'Spanish', native: 'Español' },
        { value: 'de' as Locale, label: 'German', native: 'Deutsch' },
        { value: 'pt' as Locale, label: 'Portuguese', native: 'Português' },
        { value: 'ja' as Locale, label: 'Japanese', native: '日本語' },
        { value: 'ko' as Locale, label: 'Korean', native: '한국어' },
        { value: 'ar' as Locale, label: 'Arabic', native: 'العربية' },
        { value: 'it' as Locale, label: 'Italian', native: 'Italiano' }
    ];

    return (
        <div
            className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-[480px] rounded-[16px] shadow-2xl shadow-black/10 dark:shadow-black/40 border border-gray-200/50 dark:border-gray-800/50 overflow-hidden flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 dark:border-gray-800/50 flex-shrink-0">
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white tracking-[-0.01em]">
                        {t('config.settings')}
                    </h1>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Close"
                    >
                        <X size={16} className="text-gray-500 dark:text-gray-400" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 px-7 py-6 space-y-8">

                    {/* Connection Section */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('config.connection')}
                        </h2>

                        <div className={`
                            relative rounded-xl p-5 border transition-all
                            ${isConnected
                                ? 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-200/70 dark:border-gray-700/70'
                                : 'bg-gray-50/30 dark:bg-gray-900/20 border-gray-200/50 dark:border-gray-700/50'
                            }
                        `}>
                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 p-2">
                                    <img
                                        src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                                        alt="Notion"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {t('config.notion')}
                                        </h3>
                                        {isConnected && (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-200 dark:border-emerald-800">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                                    {t('config.connected')}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {isConnected ? t('config.workspaceAuthorized') : t('config.notConnected')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Appearance Section */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('config.appearance')}
                        </h2>

                        {/* iOS-style Segmented Control */}
                        <div className="bg-gray-100 dark:bg-gray-900/50 rounded-xl p-1.5 flex gap-1">
                            {themeOptions.map(({ value, icon: Icon, label }) => {
                                const isActive = theme === value;
                                return (
                                    <button
                                        key={value}
                                        onClick={() => onThemeChange?.(value)}
                                        className={`
                                            flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                                            transition-all duration-200 text-sm font-medium
                                            ${isActive
                                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                            }
                                        `}
                                    >
                                        <Icon size={15} strokeWidth={2.5} />
                                        <span>{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Language Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Globe size={12} className="text-gray-500 dark:text-gray-400" strokeWidth={2.5} />
                            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {t('config.language')}
                            </h2>
                        </div>

                        <div className="bg-white dark:bg-gray-900/30 rounded-xl border border-gray-200/70 dark:border-gray-700/70 divide-y divide-gray-100 dark:divide-gray-800">
                            {languageOptions.map(({ value, native }) => {
                                const isActive = locale === value;
                                return (
                                    <button
                                        key={value}
                                        onClick={() => handleLanguageChange(value)}
                                        className={`
                                            w-full px-4 py-3 flex items-center justify-between
                                            transition-colors group
                                            hover:bg-gray-50 dark:hover:bg-gray-800/50
                                            first:rounded-t-xl last:rounded-b-xl
                                        `}
                                    >
                                        <span className={`text-sm font-medium ${
                                            isActive
                                                ? 'text-gray-900 dark:text-white'
                                                : 'text-gray-700 dark:text-gray-300'
                                        }`}>
                                            {native}
                                        </span>
                                        {isActive && (
                                            <Check
                                                size={16}
                                                className="text-blue-500 dark:text-blue-400"
                                                strokeWidth={3}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Actions Section */}
                    {isConnected && (
                        <section className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800/50">
                            {/* Clear Cache */}
                            <button
                                onClick={handleClearCache}
                                disabled={isProcessing}
                                className="w-full group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all">
                                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                        {isProcessing && actionType === 'cache' ? (
                                            <Loader size={16} className="text-gray-600 dark:text-gray-400 animate-spin" strokeWidth={2.5} />
                                        ) : (
                                            <Trash2 size={16} className="text-gray-600 dark:text-gray-400" strokeWidth={2.5} />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {isProcessing && actionType === 'cache' ? t('config.clearing') : t('config.clearCache')}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                            {t('config.clearCacheDescription')}
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Disconnect */}
                            <button
                                onClick={handleDisconnect}
                                disabled={isProcessing}
                                className="w-full group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-4 p-4 rounded-xl border border-red-200 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-all">
                                    <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                        {isProcessing && actionType === 'disconnect' ? (
                                            <Loader size={16} className="text-red-600 dark:text-red-400 animate-spin" strokeWidth={2.5} />
                                        ) : (
                                            <LogOut size={16} className="text-red-600 dark:text-red-400" strokeWidth={2.5} />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                                            {isProcessing && actionType === 'disconnect' ? t('config.disconnecting') : t('config.disconnect')}
                                        </p>
                                        <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                                            {t('config.disconnectDescription')}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </section>
                    )}
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/30 flex-shrink-0">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">{t('config.version')} 1.0.0</span>
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        <div className="flex items-center gap-1.5">
                            <span>{t('config.pressKey')}</span>
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700 text-[10px] font-mono font-semibold shadow-sm">
                                Shift
                            </kbd>
                            <span className="text-gray-400">+</span>
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700 text-[10px] font-mono font-semibold shadow-sm">
                                ?
                            </kbd>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
