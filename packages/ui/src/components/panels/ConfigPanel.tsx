// packages/ui/src/components/panels/ConfigPanel.tsx
// 🎨 Design System Notion - Ultra épuré et performant - avec i18n + Subscription + Auth
import { useState, useRef, useEffect, memo } from 'react';
import { X, Loader, Moon, Sun, Monitor, LogOut, Trash2, Check, ChevronDown, Globe, Crown, Zap, CreditCard, User, Mail, Edit2 } from 'lucide-react';
import { useTranslation, type Locale } from '@notion-clipper/i18n';
import { useSubscriptionContext } from '../../contexts/SubscriptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionBadge } from '../subscription/SubscriptionBadge';
import { QuotaCounter } from '../subscription/QuotaCounter';
import { UpgradeModal } from '../subscription/UpgradeModal';
import { StripeCheckoutHelper, SubscriptionTier } from '@notion-clipper/core-shared';
import type { Subscription, QuotaSummary } from '@notion-clipper/core-shared';
import { authDataManager } from '../../services/AuthDataManager';

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

function ConfigPanelComponent({
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

    // Subscription state (optional - will gracefully handle if not available)
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [quotas, setQuotas] = useState<QuotaSummary | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);

    // 🆕 Auth state (optional - will gracefully handle if not available)
    const [notionConnections, setNotionConnections] = useState<any[]>([]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [isSigningOut, setIsSigningOut] = useState(false);

    // Try to get auth context (may not be available)
    let authContext: any = null;
    let authAvailable = false;
    try {
        authContext = useAuth();
        authAvailable = authContext?.user != null;
    } catch (error) {
        // AuthProvider not available - will use AuthDataManager as fallback
        authContext = null;
        authAvailable = false;
    }

    // ✅ FIX: Si authContext n'est pas disponible, utiliser AuthDataManager comme fallback
    const authData = authDataManager.getCurrentData();
    const userEmail = authContext?.profile?.email || authData?.email || config.userEmail;
    const userName = authContext?.profile?.full_name || authData?.fullName || config.userName;
    const userProvider = authContext?.profile?.auth_provider || authData?.authProvider;
    const notionWorkspace = authData?.notionWorkspace;

    // Try to get subscription context (may not be available)
    let subscriptionContext: any = null;
    let subscriptionAvailable = false;
    try {
        subscriptionContext = useSubscriptionContext();
        subscriptionAvailable = true;
    } catch (error) {
        // SubscriptionProvider not available - subscription features will be hidden
        subscriptionContext = null;
    }

    // Load subscription data
    useEffect(() => {
        if (!subscriptionContext || !isOpen) return;

        const loadSubscriptionData = async () => {
            try {
                const [sub, quotaSummary] = await Promise.all([
                    subscriptionContext.subscriptionService.getCurrentSubscription(),
                    subscriptionContext.quotaService.getQuotaSummary(),
                ]);

                // ✅ FIX: Gérer le cas où sub est null
                setSubscription(sub || null);
                setQuotas(quotaSummary);
            } catch (error) {
                console.error('Failed to load subscription data:', error);
                // En cas d'erreur, mettre des valeurs par défaut
                setSubscription(null);
                setQuotas(null);
            }
        };

        loadSubscriptionData();
    }, [subscriptionContext, isOpen]);

    // 🆕 Load auth data and notion connections
    useEffect(() => {
        if (!authContext || !isOpen) return;

        const loadAuthData = async () => {
            try {
                // Set initial edited name from profile or fallback
                const initialName = authContext.profile?.full_name || authData?.fullName;
                if (initialName) {
                    setEditedName(initialName);
                }

                // Load notion connections from database
                if (authContext.user) {
                    const supabaseClient = (window as any).__SUPABASE_CLIENT__;
                    if (supabaseClient) {
                        const { data, error } = await supabaseClient
                            .from('notion_connections')
                            .select('*')
                            .eq('user_id', authContext.user.id)
                            .eq('is_active', true)
                            .order('created_at', { ascending: false });

                        if (!error && data) {
                            setNotionConnections(data);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load auth data:', error);
            }
        };

        loadAuthData();
    }, [authContext, isOpen]);

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

    // 🆕 Handler pour sauvegarder le nom édité
    const handleSaveName = async () => {
        if (!authContext || !editedName.trim()) return;

        try {
            const supabaseClient = (window as any).__SUPABASE_CLIENT__;
            if (supabaseClient && authContext.user) {
                const { error } = await supabaseClient
                    .from('user_profiles')
                    .update({ full_name: editedName.trim() })
                    .eq('id', authContext.user.id);

                if (error) throw error;

                // Refresh le profil
                await authContext.refreshSession();
                setIsEditingName(false);
                showNotification?.('Nom mis à jour avec succès', 'success');
            }
        } catch (error) {
            console.error('Failed to update name:', error);
            showNotification?.('Erreur lors de la mise à jour du nom', 'error');
        }
    };

    // 🆕 Handler pour se déconnecter
    const handleSignOut = async () => {
        if (!authContext) return;

        setIsSigningOut(true);
        try {
            await authContext.signOut();
            onClose();
            showNotification?.('Déconnexion réussie', 'success');

            // Optionally reload the app to reset state
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error('Sign out error:', error);
            showNotification?.('Erreur lors de la déconnexion', 'error');
        } finally {
            setIsSigningOut(false);
        }
    };

    const handleLanguageChange = (newLocale: Locale) => {
        setLocale(newLocale);
        setIsLanguageDropdownOpen(false);
        setTimeout(() => {
            showNotification?.(t('config.languageChanged'), 'success');
        }, 100);
    };

    const handleUpgrade = async () => {
        if (!subscriptionContext) return;

        setIsLoadingCheckout(true);
        setIsUpgradeModalOpen(false);

        try {
            const { url } = await subscriptionContext.subscriptionService.createCheckoutSession({
                success_url: 'notionclipper://subscription/success',
                cancel_url: 'notionclipper://subscription/canceled',
            });

            StripeCheckoutHelper.openCheckoutUrl(url);

            const cleanup = StripeCheckoutHelper.listenForCheckoutReturn(
                async () => {
                    console.log('✅ Payment successful!');
                    const sub = await subscriptionContext.subscriptionService.getCurrentSubscription();
                    setSubscription(sub);
                    cleanup();
                },
                () => {
                    console.log('❌ Payment canceled');
                    cleanup();
                }
            );
        } catch (error) {
            console.error('Failed to create checkout:', error);
            showNotification?.('Impossible de créer la session de paiement', 'error');
        } finally {
            setIsLoadingCheckout(false);
        }
    };

    const handleManageSubscription = async () => {
        if (!subscriptionContext || !subscription || subscription.tier !== SubscriptionTier.PREMIUM) {
            return;
        }

        if (!subscription.stripe_customer_id) {
            showNotification?.('Aucun compte Stripe associé', 'error');
            return;
        }

        setIsLoadingPortal(true);

        try {
            const { url } = await subscriptionContext.subscriptionService.openCustomerPortal(
                'notionclipper://settings'
            );

            StripeCheckoutHelper.openCheckoutUrl(url);
        } catch (error) {
            console.error('Failed to open portal:', error);
            showNotification?.('Impossible d\'ouvrir le portail de gestion', 'error');
        } finally {
            setIsLoadingPortal(false);
        }
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
    const isPremium = subscription?.tier === SubscriptionTier.PREMIUM;
    const isFree = subscription?.tier === SubscriptionTier.FREE;

    // Theme options with translations
    const themeOptions = [
        { value: 'light' as const, icon: Sun, label: t('config.light') },
        { value: 'dark' as const, icon: Moon, label: t('config.dark') },
        { value: 'system' as const, icon: Monitor, label: t('config.auto') }
    ];

    // Language options
    const languageOptions = [
        { value: 'en' as Locale, name: 'English' },
        { value: 'fr' as Locale, name: 'Français' },
        { value: 'es' as Locale, name: 'Español' },
        { value: 'de' as Locale, name: 'Deutsch' },
        { value: 'pt' as Locale, name: 'Português' },
        { value: 'it' as Locale, name: 'Italiano' },
        { value: 'ja' as Locale, name: '日本語' },
        { value: 'ko' as Locale, name: '한국어' },
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
                {/* Header */}
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

                {/* Body - SCROLLABLE */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* 🆕 Section Compte (Auth) - ✅ FIX: Utilise authData si authContext unavailable */}
                    {(authAvailable || authData) && (userEmail || userName) && (
                        <div className="space-y-3">
                            <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                                Compte
                            </h3>

                            {/* Profil utilisateur */}
                            <div className="p-4 rounded-xl border bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-lg shadow-lg">
                                        {(authContext?.profile?.avatar_url || config.userAvatar) ? (
                                            <img
                                                src={authContext?.profile?.avatar_url || config.userAvatar}
                                                alt={userName || 'User'}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <User size={24} strokeWidth={2} />
                                        )}
                                    </div>

                                    {/* Info utilisateur */}
                                    <div className="flex-1 min-w-0">
                                        {/* Nom (éditable) */}
                                        {isEditingName ? (
                                            <div className="flex items-center gap-2 mb-1">
                                                <input
                                                    type="text"
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveName();
                                                        if (e.key === 'Escape') setIsEditingName(false);
                                                    }}
                                                    className="flex-1 px-2 py-1 text-[14px] font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveName}
                                                    className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                                >
                                                    <Check size={14} strokeWidth={2} />
                                                </button>
                                                <button
                                                    onClick={() => setIsEditingName(false)}
                                                    className="p-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                                                >
                                                    <X size={14} strokeWidth={2} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                    {userName || 'Utilisateur'}
                                                </h4>
                                                <button
                                                    onClick={() => setIsEditingName(true)}
                                                    className="p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded transition-colors"
                                                >
                                                    <Edit2 size={12} className="text-gray-500 dark:text-gray-400" strokeWidth={2} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Email */}
                                        <div className="flex items-center gap-1.5 text-[12px] text-gray-600 dark:text-gray-300 mb-2">
                                            <Mail size={12} strokeWidth={2} />
                                            <span className="truncate">{userEmail}</span>
                                        </div>

                                        {/* Provider badge */}
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-0.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-700">
                                                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                                    {userProvider === 'google' && '🔵 Google'}
                                                    {userProvider === 'notion' && '⚡ Notion'}
                                                    {userProvider === 'email' && '✉️ Email'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notion Workspaces */}
                                {notionConnections.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                                        <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-2">
                                            Workspaces Notion connectés
                                        </p>
                                        <div className="space-y-1.5">
                                            {notionConnections.map((conn) => (
                                                <div
                                                    key={conn.id}
                                                    className="flex items-center gap-2 px-2 py-1.5 bg-white/60 dark:bg-gray-800/60 rounded-lg"
                                                >
                                                    {conn.workspace_icon && (
                                                        <span className="text-sm">{conn.workspace_icon}</span>
                                                    )}
                                                    <span className="text-[12px] text-gray-700 dark:text-gray-300 truncate flex-1">
                                                        {conn.workspace_name}
                                                    </span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Sign Out Button */}
                                <button
                                    onClick={handleSignOut}
                                    disabled={isSigningOut}
                                    className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-all disabled:opacity-50"
                                >
                                    {isSigningOut ? (
                                        <>
                                            <Loader size={14} className="animate-spin text-gray-600 dark:text-gray-400" strokeWidth={2} />
                                            <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400">
                                                Déconnexion...
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <LogOut size={14} className="text-gray-600 dark:text-gray-400" strokeWidth={2} />
                                            <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400">
                                                Se déconnecter
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Section Connexion */}
                    <div className="space-y-3">
                        <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                            {t('config.connection')}
                        </h3>

                        <div className="relative p-4 rounded-xl border transition-all duration-200 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
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

                    {/* Section Abonnement (NEW) */}
                    {subscriptionAvailable && subscription && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                                    Abonnement
                                </h3>
                                <SubscriptionBadge
                                    tier={subscription.tier}
                                    gracePeriodDaysRemaining={subscription.is_grace_period && subscription.grace_period_ends_at ? Math.ceil((new Date(subscription.grace_period_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : undefined}
                                    size="sm"
                                />
                            </div>

                            {isPremium ? (
                                <button
                                    onClick={handleManageSubscription}
                                    disabled={isLoadingPortal}
                                    className="w-full group"
                                >
                                    <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200 disabled:opacity-50">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                            {isLoadingPortal ? (
                                                <Loader size={16} className="text-blue-600 dark:text-blue-400 animate-spin" strokeWidth={2} />
                                            ) : (
                                                <CreditCard size={16} className="text-blue-600 dark:text-blue-400" strokeWidth={2} />
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                                                {isLoadingPortal ? 'Chargement...' : 'Gérer mon abonnement'}
                                            </p>
                                            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                Factures, carte, annulation
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsUpgradeModalOpen(true)}
                                        disabled={isLoadingCheckout}
                                        className="w-full group"
                                    >
                                        <div className="flex items-center gap-3 p-3 rounded-xl border border-purple-200 dark:border-purple-900/50 hover:border-purple-300 dark:hover:border-purple-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-200">
                                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                                <Zap size={16} className="text-purple-600 dark:text-purple-400" strokeWidth={2} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                                                    Passer à Premium
                                                </p>
                                                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                    3,99€/mois • Clips illimités
                                                </p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Quotas (compact) */}
                                    {quotas && (
                                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700">
                                            <QuotaCounter
                                                summary={quotas}
                                                compact
                                                showAll={false}
                                                onUpgradeClick={() => setIsUpgradeModalOpen(true)}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

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

                    {/* Section Langue */}
                    <div className="space-y-3">
                        <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                            {t('config.language')}
                        </h3>

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

                            {isLanguageDropdownOpen && (
                                <div
                                    ref={languageDropdownRef}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-50"
                                    style={{ maxHeight: '280px', overflowY: 'auto' }}
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

                {/* Footer */}
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

            {/* Upgrade Modal */}
            {subscriptionAvailable && (
                <UpgradeModal
                    isOpen={isUpgradeModalOpen}
                    onClose={() => setIsUpgradeModalOpen(false)}
                    onUpgrade={handleUpgrade}
                />
            )}
        </div>
    );
}

// Mémoïsation
export const ConfigPanel = memo(ConfigPanelComponent, (prevProps, nextProps) => {
    if (!prevProps.isOpen && !nextProps.isOpen) {
        return true;
    }

    if (prevProps.isOpen !== nextProps.isOpen) {
        return false;
    }

    return (
        prevProps.theme === nextProps.theme &&
        prevProps.config?.notionToken === nextProps.config?.notionToken &&
        prevProps.config?.userName === nextProps.config?.userName
    );
});
