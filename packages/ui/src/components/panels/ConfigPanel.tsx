// packages/ui/src/components/panels/ConfigPanel.tsx
// 🎨 Design System Notion/Apple - Ultra épuré et performant - avec i18n
import { useState, useRef, useEffect } from 'react';
import { X, Loader, Moon, Sun, Monitor, LogOut, Trash2, Check, ChevronDown, Globe } from 'lucide-react';
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
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const languageButtonRef = useRef<HTMLButtonElement>(null);
    const languageDropdownRef = useRef<HTMLDivElement>(null);

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

    const handleLanguageChange = (newLocale: Locale) => {
        setLocale(newLocale);
        setIsLanguageDropdownOpen(false); // Close dropdown immediately to prevent scroll jump
        // ✅ Wait for next tick so the locale context updates before showing notification
        setTimeout(() => {
            showNotification?.(t('config.languageChanged'), 'success');
        }, 100);
    };

    // Click outside handler for language dropdown
    useEffect(() => {
        if (!isLanguageDropdownOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                languageButtonRef.current?.contains(event.target as Node) ||
                languageDropdownRef.current?.contains(event.target as Node)
            ) {
                return;
            }
            setIsLanguageDropdownOpen(false);
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsLanguageDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isLanguageDropdownOpen]);

    if (!isOpen) return null;

    const isConnected = !!config.notionToken;

    // Theme options with translations
    const themeOptions = [
        { value: 'light' as const, icon: Sun, label: t('config.light') },
        { value: 'dark' as const, icon: Moon, label: t('config.dark') },
        { value: 'system' as const, icon: Monitor, label: t('config.auto') }
    ];

    // Language options - Native names only (Apple/Notion design philosophy)
    // Organized by script type for better scannability
    const languageOptions = [
        // Latin script
        { value: 'en' as Locale, name: 'English' },
        { value: 'fr' as Locale, name: 'Français' },
        { value: 'es' as Locale, name: 'Español' },
        { value: 'de' as Locale, name: 'Deutsch' },
        { value: 'pt' as Locale, name: 'Português' },
        { value: 'it' as Locale, name: 'Italiano' },
        // Asian scripts
        { value: 'ja' as Locale, name: '日本語' },
        { value: 'ko' as Locale, name: '한국어' },
        // RTL scripts
        { value: 'ar' as Locale, name: 'العربية' }
    ];

    return (
        <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#191919] w-full max-w-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header minimaliste */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                        {t('config.settings')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                    >
                        <X size={18} className="text-gray-400 dark:text-gray-500" strokeWidth={2} />
                    </button>
                </div>

                {/* Body - ✅ SCROLLABLE with max-height */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Section Connexion */}
                    <div className="space-y-3">
                        <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                            {t('config.connection')}
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
                                            {t('config.notion')}
                                        </p>
                                        {isConnected && (
                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                <span className="text-[11px] font-medium text-green-700 dark:text-green-400">
                                                    {t('config.connected')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                                        {isConnected ? t('config.workspaceAuthorized') : t('config.notConnected')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section Apparence */}
                    <div className="space-y-3">
                        <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                            {t('config.appearance')}
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

                    {/* Section Langue - Apple/Notion inspired dropdown */}
                    <div className="space-y-3">
                        <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                            {t('config.language')}
                        </h3>

                        {/* Language Dropdown Button */}
                        <div className="relative">
                            <button
                                ref={languageButtonRef}
                                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Globe size={16} className="text-gray-400 dark:text-gray-500" strokeWidth={2} />
                                    <span className="text-[14px] font-medium text-gray-900 dark:text-white">
                                        {languageOptions.find(lang => lang.value === locale)?.name || 'English'}
                                    </span>
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                                        isLanguageDropdownOpen ? 'rotate-180' : ''
                                    }`}
                                    strokeWidth={2}
                                />
                            </button>

                            {/* Dropdown Menu */}
                            {isLanguageDropdownOpen && (
                                <div
                                    ref={languageDropdownRef}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-50"
                                    style={{
                                        maxHeight: '280px',
                                        overflowY: 'auto'
                                    }}
                                >
                                    <div className="py-1">
                                        {languageOptions.map(({ value, name }) => {
                                            const isActive = locale === value;
                                            return (
                                                <button
                                                    key={value}
                                                    onClick={() => handleLanguageChange(value)}
                                                    className="w-full px-4 py-2.5 flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                                >
                                                    <span className={`text-[14px] font-normal tracking-[-0.01em] transition-colors ${
                                                        isActive
                                                            ? 'text-gray-900 dark:text-white font-medium'
                                                            : 'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {name}
                                                    </span>
                                                    {isActive && (
                                                        <Check
                                                            size={16}
                                                            className="text-[#007AFF] dark:text-[#0A84FF]"
                                                            strokeWidth={2.5}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section Actions */}
                    {isConnected && (
                        <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800">
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
                                            {isProcessing && actionType === 'cache' ? t('config.clearing') : t('config.clearCache')}
                                        </p>
                                        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                                            {t('config.clearCacheDescription')}
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
                                            {isProcessing && actionType === 'disconnect' ? t('config.disconnecting') : t('config.disconnect')}
                                        </p>
                                        <p className="text-[12px] text-red-600 dark:text-red-400 mt-0.5">
                                            {t('config.disconnectDescription')}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer avec version - ✅ STICKY */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 text-center font-medium">
                        {t('config.version')} 1.0.0
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-1.5 flex items-center justify-center gap-1.5">
                        <span>{t('config.pressKey')}</span>
                        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[10px] font-mono border border-gray-300 dark:border-gray-600">Shift</kbd>
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[10px] font-mono border border-gray-300 dark:border-gray-600">?</kbd>
                        <span>{t('config.shortcutsHint')}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
