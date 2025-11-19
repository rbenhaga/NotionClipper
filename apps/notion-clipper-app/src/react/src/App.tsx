// apps/notion-clipper-app/src/react/src/App.tsx - VERSION OPTIMISÉE ET MODULAIRE
import React, { memo, useState, useEffect, useCallback } from 'react';
// 🔧 FIX: Removed framer-motion dependency (AnimatePresence) to avoid build issues
import { createClient } from '@supabase/supabase-js';

// Initialize backend configuration
import './config/backend';

// 🔧 FIX: Simple icon components to avoid lucide-react dependency resolution issues in nested workspace
const Check = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const X = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// Styles
import './App.css';

// i18n
import { LocaleProvider } from '@notion-clipper/i18n';

// Supabase client - Using import.meta.env for Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('[App] 🔧 Supabase URL:', supabaseUrl);
console.log('[App] 🔧 Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing');

const supabaseClient = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Imports depuis packages/ui
import {
    Onboarding,
    Layout,
    Header,
    ContentArea,
    PageList,
    ContentEditor,
    ConfigPanel,
    NotificationManager,
    ErrorBoundary,
    SkeletonPageList,
    ResizableLayout,
    MinimalistView,
    UnifiedWorkspace,
    ShortcutsModal,
    FileUploadModal,
    UnifiedActivityPanel,
    useAppState,
    FocusModeIntro,
    LoadingScreen,
    SubscriptionProvider,
    useSubscriptionContext,
    UpgradeModal,
    QuotaCounterMini,
    GracePeriodUrgentModal,
    AuthProvider,
    useAuth,
    authDataManager,
    UserAuthData,
    analytics
} from '@notion-clipper/ui';

// Import SubscriptionTier from core-shared
import { SubscriptionTier } from '@notion-clipper/core-shared';

// Composants mémorisés
const MemoizedPageList = memo(PageList);
const MemoizedMinimalistView = memo(MinimalistView);

/**
 * Composant principal de l'application Notion Clipper
 * Version optimisée utilisant le hook composite useAppState
 */
function App() {
    // 🆕 Subscription context pour afficher les quotas dans Header
    const subscriptionContext = useSubscriptionContext();
    const [subscriptionData, setSubscriptionData] = useState<any>(null);
    const [quotasData, setQuotasData] = useState<any>(null);

    // 🎯 UN SEUL HOOK QUI GÈRE TOUT L'ÉTAT DE L'APP
    const {
        // États UI
        showOnboarding,
        setShowOnboarding,
        onboardingCompleted,
        setOnboardingCompleted,
        isOAuthCallback,
        setIsOAuthCallback,
        showConfig,
        setShowConfig,
        sidebarCollapsed,
        setSidebarCollapsed,
        multiSelectMode,
        selectedPages,
        selectedPage,
        loading,
        showPreview,
        setShowPreview,
        sending,
        sendingStatus,
        contentProperties,
        hasUserEditedContent,
        showFileUpload,
        setShowFileUpload,
        showHistoryPanel,
        setShowHistoryPanel,
        showQueuePanel,
        setShowQueuePanel,
        attachedFiles,
        showShortcuts,
        setShowShortcuts,

        // Références
        fileInputRef,

        // Hooks
        windowPreferences,
        notifications,
        config,
        pages,
        clipboard,
        history,
        queue,
        networkStatus,
        theme,

        // Handlers
        handleCompleteOnboarding,
        handleResetApp,
        handleEditContent,
        handleClearClipboard,
        handlePageSelect,
        handleToggleMultiSelect,
        handleDeselectAll,
        handleDeselectPage,
        handleUpdateProperties,
        handleAttachedFilesChange,
        handleSend,

        // Raccourcis
        shortcuts,

        // 🆕 Sections sélectionnées
        selectedSections,
        onSectionSelect,
        onSectionDeselect,
        clearSelectedSections,
        unifiedQueueHistory,

        // Utilitaires
        canSend
    } = useAppState({
        subscriptionTier: subscriptionData?.tier?.toUpperCase() || 'FREE',
        onUpgradeRequired: () => {
            setUpgradeModalFeature('offline_queue');
            setUpgradeModalQuotaReached(false);
            setShowUpgradeModal(true);
        }
    });

    // 🆕 État pour le panneau d'activité unifié
    const [showActivityPanel, setShowActivityPanel] = useState(false);

    // 🎯 États pour Focus Mode Intro
    const [showFocusModeIntro, setShowFocusModeIntro] = useState(false);
    const [focusModeIntroPage, setFocusModeIntroPage] = useState<any>(null);
    const [hasDismissedFocusModeIntro, setHasDismissedFocusModeIntro] = useState(false);

    // 🎯 États pour Subscription / Freemium
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeModalFeature, setUpgradeModalFeature] = useState<string | undefined>();
    const [upgradeModalQuotaReached, setUpgradeModalQuotaReached] = useState(false);

    // 🎯 État pour Welcome Premium Modal (onboarding trial)
    const [showWelcomePremiumModal, setShowWelcomePremiumModal] = useState(false);

    // 🎯 État pour Grace Period Urgent Modal (≤ 3 days remaining)
    const [showGracePeriodModal, setShowGracePeriodModal] = useState(false);

    // 🆕 Track which quota warnings have been shown this session (avoid spam)
    const [shownQuotaWarnings, setShownQuotaWarnings] = useState<Set<string>>(new Set());

    // 🔧 FIX: Add missing setSending state setter (useAppState only returns sending, not setSending)
    const [localSending, setLocalSending] = useState(false);
    const setSending = setLocalSending; // Alias for compatibility

    // 🔒 SECURITY: Calculate file quota remaining from quotasData
    const fileQuotaRemaining = quotasData?.files?.remaining ?? null;

    // 🔧 FIX BUG #1 - Initialiser AuthDataManager et charger les données au startup
    useEffect(() => {
        const initAuth = async () => {
            try {
                console.log('[App] 🔐 Initializing AuthDataManager...');

                // Initialiser avec le client Supabase
                authDataManager.initialize(supabaseClient, supabaseUrl, supabaseAnonKey);
                // ✅ SubscriptionService is initialized by SubscriptionContext, not here!

                // Charger les données auth sauvegardées
                const authData = await authDataManager.loadAuthData();

                // 🆕 Initialize analytics
                analytics.initialize({
                    enabled: true, // Enable analytics tracking
                    provider: 'custom',
                    debug: process.env.NODE_ENV !== 'production',
                });

                if (authData) {
                    console.log('[App] ✅ Auth data loaded:', {
                        userId: authData.userId,
                        provider: authData.authProvider,
                        hasNotionToken: !!authData.notionToken,
                        onboardingCompleted: authData.onboardingCompleted
                    });

                    // 🆕 Identify user for analytics
                    if (authData.userId) {
                        analytics.identify(authData.userId, {
                            authProvider: authData.authProvider,
                            onboardingCompleted: authData.onboardingCompleted,
                            hasNotionToken: !!authData.notionToken,
                        });
                    }

                    // 🔧 FIX CRITICAL: Si user a userId + notionToken mais onboardingCompleted=false,
                    // c'est qu'il s'est déconnecté avant de cliquer "Stay Free"
                    // On auto-complète l'onboarding pour éviter de le redemander
                    if (authData.userId && authData.notionToken && !authData.onboardingCompleted) {
                        console.log('[App] 🔧 Auto-completing onboarding (user has token but flag not set)');
                        await authDataManager.saveAuthData({
                            ...authData,
                            onboardingCompleted: true
                        });
                        authData.onboardingCompleted = true; // Update local reference
                    }

                    // 🔧 FIX BUG #9: Vérifier uniquement onboardingCompleted, pas notionToken
                    // L'utilisateur peut compléter l'onboarding sans connecter Notion (Google auth seul)
                    if (authData.onboardingCompleted) {
                        console.log('[App] 🎯 User already onboarded, skipping onboarding screen');
                        setShowOnboarding(false);
                        setOnboardingCompleted(true);

                        // Réinitialiser NotionService SI le token existe
                        if (authData.notionToken) {
                            try {
                                // 🔧 FIX: Pass token as parameter (AuthDataManager loads it from DB, not Electron config)
                                const reinitResult = await window.electronAPI?.invoke?.('notion:reinitialize-service', authData.notionToken);
                                if (reinitResult?.success) {
                                    console.log('[App] ✅ NotionService reinitialized');

                                    // Charger les pages
                                    console.log('[App] 📚 Loading pages...');
                                    await pages.loadPages();
                                    console.log('[App] ✅ Pages loaded');
                                } else {
                                    console.error('[App] ❌ Failed to reinitialize NotionService:', reinitResult?.error);
                                }
                            } catch (error) {
                                console.error('[App] ❌ Error reinitializing NotionService:', error);
                            }
                        } else {
                            console.log('[App] ℹ️ No Notion token, user needs to connect Notion workspace');
                        }
                    } else {
                        console.log('[App] ℹ️ Onboarding not completed, showing onboarding');
                        setShowOnboarding(true);
                    }
                } else {
                    console.log('[App] ℹ️ No auth data found, showing onboarding');
                    setShowOnboarding(true);
                }
            } catch (error) {
                console.error('[App] ❌ Error initializing auth:', error);
                setShowOnboarding(true);
            }
        };

        initAuth();
    }, [supabaseClient]);

    // 🆕 Load subscription and quota data for Header display
    // 🔧 FIX CRITICAL: Wait for services to be initialized before using them
    useEffect(() => {
        if (!subscriptionContext || !onboardingCompleted) {
            console.log('[App] ⏸️ Waiting for context or onboarding...', {
                hasContext: !!subscriptionContext,
                onboardingCompleted
            });
            return;
        }

        if (!subscriptionContext.isServicesInitialized) {
            console.log('[App] ⏸️ Subscription services not yet initialized, waiting...');
            return;
        }

        const loadSubscriptionData = async () => {
            try {
                console.log('[App] 📊 Loading subscription and quota data for Header...');
                const [sub, quotaSummary] = await Promise.all([
                    subscriptionContext.subscriptionService.getCurrentSubscription(),
                    subscriptionContext.quotaService.getQuotaSummary(),
                ]);

                setSubscriptionData(sub);
                setQuotasData(quotaSummary);
                console.log('[App] ✅ Subscription data loaded:', {
                    tier: sub?.tier,
                    quotas: quotaSummary?.clips
                });
            } catch (error) {
                console.error('[App] Failed to load subscription data:', error);
                setSubscriptionData(null);
                setQuotasData(null);
            }
        };

        loadSubscriptionData();
    }, [subscriptionContext, subscriptionContext?.isServicesInitialized, onboardingCompleted]);

    // 🆕 Request notification permission for push notifications (quota warnings)
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            console.log('[App] 🔔 Requesting notification permission...');
            Notification.requestPermission().then(permission => {
                console.log('[App] 🔔 Notification permission:', permission);
            });
        }
    }, []);

    // 🆕 Check grace period and show urgent modal if ≤ 3 days remaining
    useEffect(() => {
        if (!quotasData || !subscriptionData) return;

        // 🔥 MIGRATION: Use tier-based check instead of is_grace_period field
        const isGracePeriod = subscriptionData.tier === SubscriptionTier.GRACE_PERIOD;
        const daysRemaining = quotasData.grace_period_days_remaining;

        // Show urgent modal if grace period is ending soon (≤ 3 days)
        if (isGracePeriod && daysRemaining !== null && daysRemaining <= 3) {
            console.log('[App] ⚠️ Grace period ending soon:', daysRemaining, 'days');

            // 🆕 Track analytics: Grace Period Ending Soon
            analytics.trackGracePeriodEndingSoon({
                daysRemaining,
                tier: subscriptionData?.tier || 'grace_period',
            });

            // Small delay to not overwhelm user on app start
            const timer = setTimeout(() => {
                setShowGracePeriodModal(true);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [quotasData, subscriptionData]);

    // ============================================
    // HANDLERS SPÉCIFIQUES À L'APP
    // ============================================

    // Fonction vide - les fichiers sont gérés via attachedFiles dans handleSend
    const handleFileUpload = async (config: any) => {
        // Ne rien faire - les fichiers sont automatiquement envoyés via handleSend
        console.log('[App] File upload handled via attachedFiles, config:', config);
    };

    // 🔧 FIX: Window control handlers - wrap IPC calls to avoid "object could not be cloned" error
    // IPC functions return Promises, which React can't clone when passing as props
    const handleMinimize = useCallback(() => {
        window.electronAPI?.minimizeWindow?.();
    }, []);

    const handleMaximize = useCallback(() => {
        window.electronAPI?.maximizeWindow?.();
    }, []);

    const handleClose = useCallback(() => {
        window.electronAPI?.closeWindow?.();
    }, []);

    // 🆕 NOUVEAU HANDLER - Avec authentification complète (Option A)
    const handleNewOnboardingComplete = useCallback(async (data: {
        userId: string;
        email: string;
        notionToken: string;
        workspace: { id: string; name: string; icon?: string }
    }) => {
        console.log('[App] 🎯 New onboarding completed:', data);

        // 🔧 FIX: Show loading indicator during onboarding completion
        setSending(true);

        // 🔧 FIX BUG #1 - Marquer l'onboarding comme complété via AuthDataManager
        try {
            console.log('[App] 💾 Updating auth data with completion status...');

            const authData = authDataManager.getCurrentData();
            if (authData) {
                await authDataManager.saveAuthData({
                    ...authData,
                    notionToken: data.notionToken,
                    notionWorkspace: data.workspace,
                    onboardingCompleted: true // ← Marquer comme complété
                });

                console.log('[App] ✅ Auth data updated with onboarding completion');
            }
        } catch (error) {
            console.error('[App] ⚠️ Failed to update auth data:', error);
        }

        // 1. Sauvegarder le token Notion dans la notion_connection
        if (supabaseClient) {
            try {
                console.log('[App] 💾 Saving Notion connection to database...');

                // 🔧 FIX CRITICAL: Use real userId from DB (not temporary OAuth ID)
                // After saveAuthData(), authData.userId is the real DB userId
                const currentAuthData = authDataManager.getCurrentData();
                const realUserId = currentAuthData?.userId || data.userId;

                console.log('[App] 🔑 Using userId for Notion connection:', realUserId);

                await authDataManager.saveNotionConnection({
                    userId: realUserId,
                    workspaceId: data.workspace.id,
                    workspaceName: data.workspace.name,
                    workspaceIcon: data.workspace.icon,
                    accessToken: data.notionToken,
                    isActive: true
                });

                console.log('[App] ✅ Notion connection saved successfully');
            } catch (error) {
                console.error('[App] ⚠️ Failed to save notion_connection:', error);
            }
        }

        // 2. Refresh subscription after login (CRITICAL for quota tracking)
        if (subscriptionContext && subscriptionContext.isServicesInitialized) {
            try {
                console.log('[App] 🔄 Refreshing subscription after login...');
                await subscriptionContext.subscriptionService.invalidateCache();
                const [sub, quotaSummary] = await Promise.all([
                    subscriptionContext.subscriptionService.getCurrentSubscription(),
                    subscriptionContext.quotaService.getQuotaSummary(),
                ]);
                setSubscriptionData(sub);
                setQuotasData(quotaSummary);
                console.log('[App] ✅ Subscription refreshed after login:', sub?.tier);
            } catch (error) {
                console.warn('[App] Could not refresh subscription after login:', error);
            }
        }

        // 3. Sauvegarder le token localement (backward compatibility)
        const shouldShowModal = await handleCompleteOnboarding(data.notionToken, data.workspace);

        console.log('[App] 🎯 handleCompleteOnboarding returned:', shouldShowModal);

        // 4. Afficher le WelcomePremiumModal
        if (shouldShowModal === true) {
            console.log('[App] 🎉 Showing WelcomePremiumModal after onboarding');
            setTimeout(() => {
                setShowWelcomePremiumModal(true);
            }, 500); // Petit délai pour une transition fluide
        }

        // 🔧 FIX: Reset loading indicator
        setSending(false);
    }, [handleCompleteOnboarding, supabaseClient, subscriptionContext]);

    // 🔄 ANCIEN HANDLER - Pour backward compatibility (ancien flow)
    const handleCompleteOnboardingWithModal = useCallback(async (token: string, workspace?: { id: string; name: string; icon?: string }) => {
        console.log('[App] 🎯 OLD flow - Completing onboarding with workspace:', workspace);

        // Appeler le handler original pour sauvegarder le token et charger les pages
        const shouldShowModal = await handleCompleteOnboarding(token, workspace);

        console.log('[App] 🎯 handleCompleteOnboarding returned:', shouldShowModal);

        // Afficher la modal WelcomePremium
        if (shouldShowModal === true && workspace) {
            console.log('[App] 🎉 Showing WelcomePremiumModal after onboarding');
            setTimeout(() => {
                setShowWelcomePremiumModal(true);
            }, 500);
        }
    }, [handleCompleteOnboarding]);

    // 🆕 Handler pour démarrer l'essai gratuit (14 jours)
    const handleStartTrial = async () => {
        console.log('[App] 🚀 Starting 14-day trial...');

        try {
            // Récupérer l'userId depuis AuthDataManager
            const authData = authDataManager.getCurrentData();
            if (!authData?.userId) {
                throw new Error('User not authenticated');
            }

            console.log('[App] Creating checkout for user:', authData.userId);

            // 🔧 FIX: Appeler directement via fetch avec l'anon key
            const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`
                },
                body: JSON.stringify({
                    userId: authData.userId,
                    trial_days: 14
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[App] Edge Function error:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            if (data?.url) {
                // Ouvrir le Stripe Checkout dans le navigateur
                console.log('[App] Opening Stripe Checkout:', data.url);
                await (window as any).electronAPI?.invoke('open-external', data.url);

                // Fermer la modal
                setShowWelcomePremiumModal(false);

                notifications.showNotification('Redirection vers le paiement...', 'info');
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (error) {
            console.error('[App] Error starting trial:', error);
            notifications.showNotification(
                `Erreur lors du démarrage de l'essai: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );
        }
    };

    // 🆕 Handler pour upgrade immédiat (sans trial)
    const handleUpgradeNow = async (plan: 'monthly' | 'yearly') => {
        console.log('[App] 💳 Upgrading now to:', plan);

        // 🆕 Track analytics: Upgrade Button Clicked
        analytics.trackUpgradeClicked({
            feature: upgradeModalFeature,
            quotaReached: upgradeModalQuotaReached,
            source: 'quota_check',
            plan,
        });

        try {
            // Récupérer l'userId depuis AuthDataManager
            const authData = authDataManager.getCurrentData();
            if (!authData?.userId) {
                throw new Error('User not authenticated');
            }

            console.log('[App] Creating checkout for user:', authData.userId, 'plan:', plan);

            // 🆕 Track analytics: Checkout Started
            analytics.trackCheckoutStarted({ plan });

            // 🔧 FIX: Appeler directement via fetch avec l'anon key
            const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`
                },
                body: JSON.stringify({
                    userId: authData.userId,
                    plan // 'monthly' ou 'annual'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[App] Edge Function error:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            if (data?.url) {
                // Ouvrir le Stripe Checkout dans le navigateur
                console.log('[App] Opening Stripe Checkout:', data.url);
                await (window as any).electronAPI?.invoke('open-external', data.url);

                // Fermer la modal
                setShowWelcomePremiumModal(false);

                notifications.showNotification('Redirection vers le paiement...', 'info');
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (error) {
            console.error('[App] Error upgrading:', error);
            notifications.showNotification(
                `Erreur lors de l'upgrade: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'error'
            );
        }
    };

    // 🆕 Handler pour rester en gratuit
    const handleStayFree = async () => {
        console.log('[App] 💚 User chose to stay free');
        setShowWelcomePremiumModal(false);

        // ✅ Terminer l'onboarding et sauvegarder
        setShowOnboarding(false);
        setOnboardingCompleted(true);

        // 🔧 CRITICAL FIX: Load fresh auth data FIRST to avoid overwriting Notion token
        // Using getCurrentData() would return stale memory cache from before Notion auth
        const authData = await authDataManager.loadAuthData(true); // forceRefresh = true
        console.log('[App] 🔄 Loaded fresh auth data before saving:', {
            userId: authData?.userId,
            hasNotionToken: !!authData?.notionToken,
            workspace: authData?.notionWorkspace?.name
        });

        if (authData) {
            // 💾 Save with onboardingCompleted flag, preserving ALL existing data
            await authDataManager.saveAuthData({
                ...authData,
                onboardingCompleted: true
            });
            console.log('[App] ✅ Onboarding completion saved with fresh data');

            // Vérifier si Notion a été connecté
            const hasNotionToken = !!authData.notionToken;

            if (hasNotionToken) {
                console.log('[App] 🔄 Reinitializing NotionService...');
                try {
                    // 🔧 FIX: Pass token as parameter (AuthDataManager loads it from DB, not Electron config)
                    const reinitResult = await window.electronAPI?.invoke?.('notion:reinitialize-service', authData.notionToken);
                    if (reinitResult?.success) {
                        console.log('[App] ✅ NotionService reinitialized');

                        // 📚 Charger les pages Notion maintenant que le service est prêt
                        console.log('[App] 📚 Loading Notion pages after onboarding...');
                        await pages.loadPages();
                        console.log('[App] ✅ Pages loaded successfully');
                    } else {
                        console.error('[App] ❌ Failed to reinitialize NotionService:', reinitResult?.error);
                    }
                } catch (error) {
                    console.error('[App] ❌ Error reinitializing NotionService:', error);
                }
            } else {
                console.log('[App] ℹ️ No Notion token found, skipping NotionService initialization');
            }
        }

        notifications.showNotification('Vous pouvez upgrader à tout moment depuis les paramètres !', 'info');
    };

    // 🎯 Handler pour ouvrir la modal d'upgrade
    const handleShowUpgradeModal = (feature?: string, quotaReached: boolean = false) => {
        setUpgradeModalFeature(feature);
        setUpgradeModalQuotaReached(quotaReached);
        setShowUpgradeModal(true);

        // 🆕 Track analytics: Upgrade Modal Shown
        analytics.trackUpgradeModalShown({
            feature,
            quotaReached,
            source: quotaReached ? 'quota_check' : 'feature_attempt',
        });
    };

    // 🎯 Vérification réelle des quotas avec SubscriptionService
    const checkQuota = async (): Promise<boolean> => {
        try {
            // ✅ Use SubscriptionContext instance (not direct import!)
            if (!subscriptionContext) {
                console.warn('[App] ⚠️ SubscriptionContext not available, allowing action');
                return true;
            }

            // 🔧 FIX CRITICAL: Check if services are initialized before using them
            if (!subscriptionContext.isServicesInitialized) {
                console.warn('[App] ⚠️ Services not yet initialized, allowing action');
                return true;
            }

            // 🔥 CRITICAL FIX: Vérifier AUSSI le quota fichiers si des fichiers sont attachés
            if (attachedFiles.length > 0) {
                const fileQuotaResult = await checkFileQuota(attachedFiles.length);
                if (!fileQuotaResult.canUpload) {
                    console.log(`[App] ❌ File quota reached: trying to send ${attachedFiles.length} files but only ${fileQuotaResult.remaining || 0} remaining`);

                    // 🆕 Track analytics: Quota Reached (files)
                    if (quotasData?.files) {
                        // 🔥 MIGRATION: tier is now UPPERCASE (FREE/PREMIUM/GRACE_PERIOD)
                        analytics.trackQuotaReached({
                            feature: 'files',
                            tier: subscriptionData?.tier || 'FREE',
                            used: quotasData.files.used,
                            limit: quotasData.files.limit,
                            percentage: quotasData.files.percentage,
                        });
                    }

                    handleShowUpgradeModal('files', true);
                    return false;
                }
                console.log(`[App] ✅ File quota check passed: ${attachedFiles.length} file(s)`);
            }

            // Vérifier si l'utilisateur peut créer un clip
            const canCreate = await subscriptionContext.subscriptionService.canPerformAction('clip', 1);

            if (!canCreate) {
                // Quota atteint !
                console.log('[App] ❌ Quota reached for clips');

                // 🆕 Track analytics: Quota Reached
                if (quotasData?.clips) {
                    // 🔥 MIGRATION: tier is now UPPERCASE (FREE/PREMIUM/GRACE_PERIOD)
                    analytics.trackQuotaReached({
                        feature: 'clips',
                        tier: subscriptionData?.tier || 'FREE',
                        used: quotasData.clips.used,
                        limit: quotasData.clips.limit,
                        percentage: quotasData.clips.percentage,
                    });
                }

                handleShowUpgradeModal('clips', true);
                return false;
            }

            console.log('[App] ✅ Quota check passed for clip');
            return true;
        } catch (error) {
            console.error('[App] ❌ Error checking quota:', error);
            // En cas d'erreur, autoriser (fail-safe)
            return true;
        }
    };

    // 🆕 Quota check pour fichiers (10/mois FREE)
    const checkFileQuota = async (filesCount: number): Promise<{ canUpload: boolean; quotaReached: boolean; remaining?: number }> => {
        try {
            if (!subscriptionContext?.isServicesInitialized) {
                return { canUpload: true, quotaReached: false };
            }

            const summary = await subscriptionContext.quotaService.getQuotaSummary();
            const remaining = summary.files.remaining;

            return {
                canUpload: summary.files.can_use && (remaining === null || remaining >= filesCount),
                quotaReached: !summary.files.can_use,
                remaining: remaining !== null ? remaining : undefined
            };
        } catch (error) {
            console.error('[App] ❌ Error checking file quota:', error);
            return { canUpload: true, quotaReached: false };
        }
    };

    // 🆕 Quota check pour Focus Mode (60min/mois FREE)
    const checkFocusModeQuota = async (): Promise<{ canUse: boolean; quotaReached: boolean; remaining?: number }> => {
        try {
            if (!subscriptionContext?.isServicesInitialized) {
                return { canUse: true, quotaReached: false };
            }

            const summary = await subscriptionContext.quotaService.getQuotaSummary();
            const remaining = summary.focus_mode_minutes.remaining;

            return {
                canUse: summary.focus_mode_minutes.can_use,
                quotaReached: !summary.focus_mode_minutes.can_use,
                remaining: remaining !== null ? remaining : undefined
            };
        } catch (error) {
            console.error('[App] ❌ Error checking focus mode quota:', error);
            return { canUse: true, quotaReached: false };
        }
    };

    // 🆕 Quota check pour Compact Mode (60min/mois FREE)
    const checkCompactModeQuota = async (): Promise<{ canUse: boolean; quotaReached: boolean; remaining?: number }> => {
        try {
            if (!subscriptionContext?.isServicesInitialized) {
                return { canUse: true, quotaReached: false };
            }

            const summary = await subscriptionContext.quotaService.getQuotaSummary();
            const remaining = summary.compact_mode_minutes.remaining;

            return {
                canUse: summary.compact_mode_minutes.can_use,
                quotaReached: !summary.compact_mode_minutes.can_use,
                remaining: remaining !== null ? remaining : undefined
            };
        } catch (error) {
            console.error('[App] ❌ Error checking compact mode quota:', error);
            return { canUse: true, quotaReached: false };
        }
    };

    // 🆕 Refresh quota data (helper) - mémorisé pour éviter les re-renders
    const refreshQuotaData = useCallback(async () => {
        if (!subscriptionContext?.isServicesInitialized) return;

        try {
            console.log('[App] 🔄 Refreshing quota data...');
            subscriptionContext.subscriptionService.invalidateCache();

            const [sub, quotaSummary] = await Promise.all([
                subscriptionContext.subscriptionService.getCurrentSubscription(),
                subscriptionContext.quotaService.getQuotaSummary(),
            ]);

            setSubscriptionData(sub);
            setQuotasData(quotaSummary);
            console.log('[App] ✅ Quota data refreshed:', {
                clips: quotaSummary?.clips,
                files: quotaSummary?.files,
                focusMode: quotaSummary?.focus_mode_minutes,
                compactMode: quotaSummary?.compact_mode_minutes
            });

            // 🆕 Afficher toast si proche de la limite (< 20%)
            checkAndShowQuotaWarnings(quotaSummary);
        } catch (error) {
            console.error('[App] ❌ Error refreshing quota data:', error);
        }
    }, [subscriptionContext?.isServicesInitialized, subscriptionContext?.subscriptionService, subscriptionContext?.quotaService]);

    // 🆕 Track usage après action - mémorisé pour éviter les re-renders
    // Returns true if quota is now exceeded (for auto-close logic)
    const trackUsage = useCallback(async (feature: 'clips' | 'files' | 'focus_mode_minutes' | 'compact_mode_minutes', amount: number = 1): Promise<boolean> => {
        try {
            if (!subscriptionContext?.isServicesInitialized) {
                console.warn('[App] ⚠️ Cannot track usage - services not initialized');
                return false;
            }

            console.log(`[App] 📊 Tracking usage: ${feature} +${amount}`);
            await subscriptionContext.usageTrackingService.track(feature, amount);

            // Refresh quotas après tracking
            await refreshQuotaData();

            // 🔒 SECURITY: Check if quota is now exceeded after tracking
            const summary = await subscriptionContext.quotaService.getQuotaSummary();
            const featureQuota = summary[feature];

            if (featureQuota && !featureQuota.can_use) {
                console.log(`[App] ⚠️ Quota exceeded for ${feature} after tracking`);
                return true; // Quota exceeded
            }

            return false; // Quota still OK
        } catch (error) {
            console.error('[App] ❌ Error tracking usage:', error);
            return false;
        }
    }, [subscriptionContext?.isServicesInitialized, subscriptionContext?.usageTrackingService, subscriptionContext?.quotaService, refreshQuotaData]);

    // 🆕 Track compact mode usage - mémorisé pour éviter les re-renders
    const handleTrackCompactUsage = useCallback(async (minutes: number) => {
        const quotaExceeded = await trackUsage('compact_mode_minutes', minutes);

        // 🔒 SECURITY: Auto-close Compact Mode if quota exceeded
        if (quotaExceeded) {
            console.log('[App] 🔒 Auto-closing Compact Mode - quota exceeded');

            // Close Compact Mode
            if (windowPreferences.isMinimalist) {
                windowPreferences.toggleMinimalist();
            }

            // Show upgrade modal
            handleShowUpgradeModal('compact_mode_minutes', true);
        }
    }, [trackUsage, windowPreferences, handleShowUpgradeModal]);

    // 🆕 Afficher toasts + push notifications si quotas proches limite
    const checkAndShowQuotaWarnings = (summary: any) => {
        if (!summary) return;

        const showWarning = (feature: string, message: string, quotaData: any) => {
            // Ne montrer qu'une fois par session
            if (shownQuotaWarnings.has(feature)) return;

            // Marquer comme affiché
            setShownQuotaWarnings(prev => new Set(prev).add(feature));

            // 🆕 Track analytics: Quota Warning Shown
            // 🔥 MIGRATION: tier is now UPPERCASE (FREE/PREMIUM/GRACE_PERIOD)
            analytics.trackQuotaWarning({
                feature: feature as any,
                tier: subscriptionData?.tier || 'FREE',
                used: quotaData.used,
                limit: quotaData.limit,
                percentage: quotaData.percentage,
            });

            // Toast notification (in-app)
            notifications.showNotification(message, 'warning');

            // 🆕 Push notification (système)
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification('Notion Clipper Pro', {
                        body: message,
                        icon: '/icon.png',
                        badge: '/icon.png',
                        tag: `quota-${feature}`, // Évite les doublons
                        requireInteraction: false,
                    });
                } catch (error) {
                    console.warn('[App] Failed to show push notification:', error);
                }
            }
        };

        // Clips warning (< 20% remaining = > 80% used)
        if (
            summary.clips.is_limited &&
            summary.clips.percentage > 80 &&
            summary.clips.percentage < 100
        ) {
            showWarning(
                'clips',
                `Plus que ${summary.clips.remaining} clips ce mois-ci. Passez à Premium pour un usage illimité.`,
                summary.clips
            );
        }

        // Files warning
        if (
            summary.files.is_limited &&
            summary.files.percentage > 80 &&
            summary.files.percentage < 100
        ) {
            showWarning(
                'files',
                `Plus que ${summary.files.remaining} fichiers ce mois-ci. Passez à Premium.`,
                summary.files
            );
        }

        // Focus mode warning
        if (
            summary.focus_mode_minutes.is_limited &&
            summary.focus_mode_minutes.percentage > 80 &&
            summary.focus_mode_minutes.percentage < 100
        ) {
            showWarning(
                'focus_mode_minutes',
                `Plus que ${summary.focus_mode_minutes.remaining} minutes de Mode Focus ce mois-ci.`,
                summary.focus_mode_minutes
            );
        }

        // Compact mode warning
        if (
            summary.compact_mode_minutes.is_limited &&
            summary.compact_mode_minutes.percentage > 80 &&
            summary.compact_mode_minutes.percentage < 100
        ) {
            showWarning(
                'compact_mode_minutes',
                `Plus que ${summary.compact_mode_minutes.remaining} minutes de Mode Compact ce mois-ci.`,
                summary.compact_mode_minutes
            );
        }
    };

    // 🎯 Wrapper de handleSend avec vérification de quota
    const handleSendWithQuotaCheck = useCallback(async () => {
        // Vérifier le quota avant d'envoyer
        const quotaOk = await checkQuota();
        if (!quotaOk) {
            console.log('[App] ❌ Quota reached, showing upgrade modal');
            return;
        }

        // Si quota OK, envoyer normalement
        console.log('[App] ✅ Quota OK, sending...');
        try {
            // 🔥 CRITICAL: Get current quota BEFORE sending to detect changes
            const currentClipsUsed = quotasData?.clips?.used || 0;

            await handleSend();

            // Note: Quota is tracked server-side in Supabase via IPC handler (secure, not crackable)
            // No need to increment locally - it's handled in backend

            // 🔧 FIX BUG #4: Invalidate cache and refresh quota data to update UI counter
            if (subscriptionContext && subscriptionContext.isServicesInitialized) {
                try {
                    console.log('[App] 🔄 Polling for quota update after send...');

                    // 🔥 CRITICAL: Invalidate cache first so next fetch is fresh
                    subscriptionContext.subscriptionService.invalidateCache();

                    // 🎯 NEW: Poll for quota change instead of fixed delay (more reliable)
                    let attempts = 0;
                    const maxAttempts = 10; // Max 5 seconds (10 * 500ms)
                    let quotaChanged = false;

                    while (attempts < maxAttempts && !quotaChanged) {
                        await new Promise(resolve => setTimeout(resolve, 500));

                        const [sub, quotaSummary] = await Promise.all([
                            subscriptionContext.subscriptionService.getCurrentSubscription(),
                            subscriptionContext.quotaService.getQuotaSummary(),
                        ]);

                        // Check if quota has been updated
                        const newClipsUsed = quotaSummary?.clips?.used || 0;
                        if (newClipsUsed > currentClipsUsed) {
                            quotaChanged = true;
                            setSubscriptionData(sub);
                            setQuotasData(quotaSummary);
                            console.log('[App] ✅ Quota updated after', attempts + 1, 'attempts:', {
                                clips: quotaSummary?.clips,
                                files: quotaSummary?.files,
                                focusMode: quotaSummary?.focus_mode_minutes,
                                compactMode: quotaSummary?.compact_mode_minutes
                            });
                        } else {
                            attempts++;
                            console.log('[App] ⏳ Waiting for quota update... attempt', attempts);
                        }
                    }

                    if (!quotaChanged) {
                        console.warn('[App] ⚠️ Quota polling timeout - forcing refresh anyway');
                        const [sub, quotaSummary] = await Promise.all([
                            subscriptionContext.subscriptionService.getCurrentSubscription(),
                            subscriptionContext.quotaService.getQuotaSummary(),
                        ]);
                        setSubscriptionData(sub);
                        setQuotasData(quotaSummary);
                    }
                } catch (refreshError) {
                    console.error('[App] ⚠️ Failed to refresh quota:', refreshError);
                }
            }
        } catch (error) {
            console.error('[App] ❌ Error during send:', error);
        }
    }, [handleSend, subscriptionContext]);

    // 🆕 Handler pour ouvrir le panneau d'activité
    const handleStatusClick = () => {
        setShowActivityPanel(true);
    };

    // 🆕 Calculer les statistiques pour l'indicateur de statut
    const pendingCount = unifiedQueueHistory.entries.filter((e: any) =>
        e.status === 'pending' || e.status === 'offline'
    ).length;

    const errorCount = unifiedQueueHistory.entries.filter((e: any) =>
        e.status === 'error'
    ).length;

    // ============================================
    // 🎯 FOCUS MODE INTRO - EFFECTS
    // ============================================

    // Charger la préférence depuis le stockage au montage
    useEffect(() => {
        const loadFocusModeIntroPreference = async () => {
            try {
                const dismissed = await (window as any).electronAPI?.invoke('config:get', 'focusModeIntroDismissed');
                console.log('[App] Loaded focusModeIntroDismissed from config:', dismissed);
                setHasDismissedFocusModeIntro(dismissed === true);
            } catch (error) {
                console.error('Error loading Focus Mode intro preference:', error);
            }
        };

        loadFocusModeIntroPreference();
    }, []);

    // Écouter l'activation du Mode Focus pour afficher l'intro - VERSION SIMPLIFIÉE
    useEffect(() => {
        const electronAPI = (window as any).electronAPI;
        let introShownThisSession = false; // Variable locale pour éviter les re-renders

        const handleFocusModeEnabled = async (data: any) => {
            console.log('[App] Focus mode enabled event received:', data);

            // Vérifier la config actuelle à chaque événement
            try {
                const dismissed = await (window as any).electronAPI?.invoke('config:get', 'focusModeIntroDismissed');
                console.log('[App] Current dismissed status:', dismissed);

                // Si pas encore dismissed ET pas encore montré dans cette session
                if (!dismissed && !introShownThisSession) {
                    console.log('[App] Showing Focus Mode intro for:', data.pageTitle);
                    introShownThisSession = true; // Marquer localement

                    setFocusModeIntroPage({
                        id: data.pageId,
                        title: data.pageTitle
                    });
                    setShowFocusModeIntro(true);
                } else {
                    console.log('[App] Skipping intro - dismissed:', dismissed, 'shown this session:', introShownThisSession);
                }
            } catch (error) {
                console.error('[App] Error checking intro status:', error);
            }
        };

        electronAPI?.on('focus-mode:enabled', handleFocusModeEnabled);

        return () => {
            electronAPI?.removeListener('focus-mode:enabled', handleFocusModeEnabled);
        };
    }, []); // Pas de dépendances pour éviter les re-renders

    // 🆕 Listen to Focus Mode time tracking
    useEffect(() => {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) return;

        const handleFocusModeTrackUsage = async (data: any) => {
            console.log('[App] Focus Mode track usage event received:', data);
            const quotaExceeded = await trackUsage('focus_mode_minutes', data.minutes || 1);

            // 🔒 SECURITY: Auto-close Focus Mode if quota exceeded
            if (quotaExceeded) {
                console.log('[App] 🔒 Auto-closing Focus Mode - quota exceeded');

                // Disable Focus Mode via IPC
                try {
                    await electronAPI?.invoke('focus-mode:disable');
                    console.log('[App] ✅ Focus Mode disabled due to quota');
                } catch (error) {
                    console.error('[App] ❌ Error disabling Focus Mode:', error);
                }

                // Show upgrade modal
                handleShowUpgradeModal('focus_mode_minutes', true);
            }
        };

        electronAPI?.on('focus-mode:track-usage', handleFocusModeTrackUsage);

        return () => {
            electronAPI?.removeListener('focus-mode:track-usage', handleFocusModeTrackUsage);
        };
    }, [trackUsage, handleShowUpgradeModal]); // Depend on trackUsage and handleShowUpgradeModal

    // 🔒 SECURITY: Track Focus Mode clip sends
    useEffect(() => {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) return;

        const handleFocusModeTrackClip = async (data: { clips: number }) => {
            console.log('[App] Focus Mode clip tracking:', data);
            await trackUsage('clips', data.clips);
        };

        electronAPI?.on('focus-mode:track-clip', handleFocusModeTrackClip);

        return () => {
            electronAPI?.removeListener('focus-mode:track-clip', handleFocusModeTrackClip);
        };
    }, [trackUsage]);

    // 🔒 SECURITY: Track Focus Mode file uploads
    useEffect(() => {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) return;

        const handleFocusModeTrackFiles = async (data: { files: number }) => {
            console.log('[App] Focus Mode file tracking:', data);
            await trackUsage('files', data.files);
        };

        electronAPI?.on('focus-mode:track-files', handleFocusModeTrackFiles);

        return () => {
            electronAPI?.removeListener('focus-mode:track-files', handleFocusModeTrackFiles);
        };
    }, [trackUsage]);

    // 🔥 CRITICAL: Add Focus Mode clips to unified history
    useEffect(() => {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) return;

        const handleFocusModeClipSent = async (data: {
            content: any;
            pageId: string;
            pageTitle?: string;
            sectionId?: string;
            timestamp: number;
            status: 'success' | 'error';
        }) => {
            console.log('[App] 📊 Focus Mode clip sent - adding to history:', data);

            // Add to unified history
            if (unifiedQueueHistory?.addToHistory) {
                await unifiedQueueHistory.addToHistory(
                    data.content,
                    data.pageId,
                    data.status,
                    undefined, // no error
                    data.sectionId
                );
                console.log('[App] ✅ Focus Mode clip added to history');
            }
        };

        electronAPI?.on('focus-mode:clip-sent', handleFocusModeClipSent);

        return () => {
            electronAPI?.removeListener('focus-mode:clip-sent', handleFocusModeClipSent);
        };
    }, [unifiedQueueHistory]);

    // 🔒 SECURITY: Sync offline usage queue when back online
    useEffect(() => {
        if (!subscriptionContext?.isServicesInitialized || !networkStatus.isOnline) {
            return;
        }

        const syncOfflineQueue = async () => {
            try {
                const stats = subscriptionContext.usageTrackingService.getOfflineQueueStats();
                
                if (stats.count === 0) {
                    return; // Nothing to sync
                }

                console.log(`[App] 🔄 Syncing ${stats.count} offline usage events...`);
                
                const syncedCount = await subscriptionContext.usageTrackingService.syncOfflineQueue();
                
                if (syncedCount > 0) {
                    console.log(`[App] ✅ Synced ${syncedCount} offline usage events`);
                    
                    // Refresh quotas after sync
                    await refreshQuotaData();
                    
                    // Show notification
                    notifications.showNotification(
                        `Synchronized ${syncedCount} offline usage event(s)`,
                        'success'
                    );
                }
            } catch (error) {
                console.error('[App] ❌ Error syncing offline queue:', error);
            }
        };

        // Sync immediately when coming back online
        syncOfflineQueue();
    }, [networkStatus.isOnline, subscriptionContext?.isServicesInitialized, subscriptionContext?.usageTrackingService, refreshQuotaData, notifications]);

    // Handlers pour le FocusModeIntro
    const handleFocusModeIntroComplete = async () => {
        console.log('[App] Focus Mode intro completed');
        setShowFocusModeIntro(false);
        
        // Sauvegarder la préférence
        try {
            await (window as any).electronAPI?.invoke('config:set', 'focusModeIntroDismissed', true);
            console.log('[App] Focus Mode intro preference saved');
            // Mettre à jour l'état local après sauvegarde réussie
            setHasDismissedFocusModeIntro(true);
            
            // Afficher la bulle flottante après completion de l'intro
            console.log('[App] Showing bubble after intro completion');
            await (window as any).electronAPI?.focusMode?.showBubbleAfterIntro();
        } catch (error) {
            console.error('Error saving Focus Mode intro preference:', error);
            // En cas d'erreur, ne pas marquer comme dismissed
        }
    };

    const handleFocusModeIntroSkip = async () => {
        console.log('[App] Focus Mode intro skipped');
        setShowFocusModeIntro(false);
        
        // Sauvegarder la préférence
        try {
            await (window as any).electronAPI?.invoke('config:set', 'focusModeIntroDismissed', true);
            console.log('[App] Focus Mode intro preference saved (skipped)');
            // Mettre à jour l'état local après sauvegarde réussie
            setHasDismissedFocusModeIntro(true);
        } catch (error) {
            console.error('Error saving Focus Mode intro preference:', error);
            // En cas d'erreur, ne pas marquer comme dismissed
        }
    };

    // Alias pour compatibilité avec FocusModeIntro
    const handleCloseFocusModeIntro = handleFocusModeIntroComplete;

    // ============================================
    // HANDLERS POUR CONFIG PANEL
    // ============================================

    const handleClearCache = async () => {
        try {
            if (!window.electronAPI) {
                throw new Error('ElectronAPI not available');
            }
            
            console.log('[App] 🧹 Starting complete cache clear...');
            
            // 1. Clear Electron cache
            await window.electronAPI.invoke('cache:clear');
            
            // 2. Clear localStorage manually (double sécurité)
            localStorage.clear();
            
            // 3. Clear specific keys if needed
            const keysToRemove = [
                'offline-queue',
                'offline-history', 
                'windowPreferences',
                'notion-clipper-config',
                'notion-clipper-cache'
            ];
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log('[App] ✅ Complete cache clear finished');
            notifications.showNotification('Cache complètement vidé avec succès', 'success');
            
            // Recharger les pages après vidage du cache
            await pages.loadPages();
            
            // Force refresh des hooks qui utilisent localStorage
            window.location.reload();
        } catch (error: any) {
            console.error('[handleClearCache] Error:', error);
            notifications.showNotification(`Erreur lors du vidage du cache: ${error.message}`, 'error');
        }
    };

    const handleDisconnect = async () => {
        try {
            if (!window.electronAPI) {
                throw new Error('ElectronAPI not available');
            }

            console.log('[App] 🧹 Starting complete disconnect...');

            // 1. ✅ Clear AuthDataManager first (clears memory + storage + Electron)
            await authDataManager.clearAuthData();
            console.log('[App] ✅ AuthDataManager cleared');

            // 2. Reset configuration complète (inclut cache, history, queue)
            await window.electronAPI.invoke('config:reset');

            // 3. Clear localStorage manuellement (double sécurité)
            localStorage.clear();

            // 4. Clear specific keys (par précaution)
            const keysToRemove = [
                'offline-queue',
                'offline-history',
                'windowPreferences',
                'notion-clipper-config',
                'notion-clipper-cache',
                'auth_user_id',
                'auth_email',
                'auth_provider',
                'onboarding_completed'
            ];
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            // 5. Clear session storage aussi
            sessionStorage.clear();

            console.log('[App] ✅ Complete disconnect finished');
            notifications.showNotification('Déconnecté avec succès - Toutes les données effacées', 'success');

            // Forcer le rechargement de l'application pour revenir à l'onboarding
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error: any) {
            console.error('[handleDisconnect] Error:', error);
            notifications.showNotification(`Erreur lors de la déconnexion: ${error.message}`, 'error');
        }
    };

    // ============================================
    // RENDU CONDITIONNEL - OAUTH CALLBACK
    // ============================================

    if (isOAuthCallback) {
        return (
            <ErrorBoundary>
                <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion réussie !</h2>
                        <p className="text-gray-600 mb-6">Votre workspace Notion est maintenant connecté</p>
                        <button
                            onClick={() => {
                                // 🔧 FIX: Only dismiss OAuth callback screen, keep onboarding open to complete setup
                                setIsOAuthCallback(false);
                                // Don't set showOnboarding=false - let Onboarding component complete and call handleNewOnboardingComplete
                            }}
                            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
                        >
                            Continuer
                        </button>
                    </div>
                </div>
            </ErrorBoundary>
        );
    }

    // ============================================
    // RENDU CONDITIONNEL - MODE MINIMALISTE
    // ============================================

    if (windowPreferences.isMinimalist) {
        return (
            <ErrorBoundary>
                <Layout loading={loading}>
                    <Header
                        isConnected={networkStatus.isOnline}
                        isPinned={windowPreferences.isPinned}
                        onTogglePin={windowPreferences.togglePin}
                        isMinimalist={windowPreferences.isMinimalist}
                        onToggleMinimalist={windowPreferences.toggleMinimalist}
                        onMinimize={handleMinimize}
                        onMaximize={handleMaximize}
                        onClose={handleClose}
                        onOpenConfig={() => setShowConfig(true)}
                        pendingCount={pendingCount}
                        errorCount={errorCount}
                        onStatusClick={handleStatusClick}
                        selectedPage={selectedPage}
                        quotaSummary={quotasData}
                        subscriptionTier={subscriptionData?.tier || SubscriptionTier.FREE}
                        onUpgradeClick={() => setShowUpgradeModal(true)}
                        // 🆕 Quota checks pour Focus/Compact Mode
                        onFocusModeCheck={checkFocusModeQuota}
                        onCompactModeCheck={checkCompactModeQuota}
                        onQuotaExceeded={(feature) => handleShowUpgradeModal(feature, true)}
                    />

                    <MemoizedMinimalistView
                        clipboard={clipboard.clipboard}
                        editedClipboard={clipboard.editedClipboard}
                        onEditContent={handleEditContent}
                        selectedPage={selectedPage}
                        pages={pages.pages}
                        onPageSelect={handlePageSelect}
                        onSend={handleSendWithQuotaCheck}
                        onClearClipboard={handleClearClipboard}
                        onExitMinimalist={windowPreferences.toggleMinimalist}
                        sending={sending}
                        canSend={canSend}
                        attachedFiles={attachedFiles}
                        onFilesChange={handleAttachedFilesChange}
                        onFileUpload={handleFileUpload}
                        // 🆕 Quota check Compact Mode
                        onCompactModeCheck={checkCompactModeQuota}
                        onQuotaExceeded={() => handleShowUpgradeModal('compact_mode_minutes', true)}
                        isCompactModeActive={windowPreferences.isMinimalist}
                        onTrackCompactUsage={handleTrackCompactUsage}
                        // 🔒 SECURITY: File quota enforcement
                        fileQuotaRemaining={fileQuotaRemaining}
                        onFileQuotaExceeded={() => handleShowUpgradeModal('files', true)}
                    />

                    <NotificationManager
                        notifications={notifications.notifications}
                        onClose={notifications.closeNotification}
                    />

                    {/* 🔧 FIX: Removed AnimatePresence (framer-motion) */}
                    <>
                        {showConfig && (
                            <ConfigPanel
                                isOpen={showConfig}
                                config={config.config}
                                onClose={() => setShowConfig(false)}
                                showNotification={notifications.showNotification}
                                onClearCache={handleClearCache}
                                onDisconnect={handleDisconnect}
                                theme={theme.theme}
                                onThemeChange={theme.setTheme}
                            />
                        )}
                    </>

                    <ShortcutsModal
                        isOpen={showShortcuts}
                        onClose={() => setShowShortcuts(false)}
                        shortcuts={shortcuts}
                    />

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                                const newFiles = files.map(file => ({
                                    id: Date.now() + Math.random(),
                                    file,
                                    name: file.name,
                                    type: file.type,
                                    size: file.size
                                }));
                                handleAttachedFilesChange([...attachedFiles, ...newFiles]);
                            }
                            e.target.value = '';
                        }}
                    />
                </Layout>
            </ErrorBoundary>
        );
    }

    // ============================================
    // RENDU CONDITIONNEL - ONBOARDING
    // ============================================

    if (showOnboarding) {
        return (
            <ErrorBoundary>
                <Layout>
                    <Onboarding
                        mode="default"
                        variant="app"
                        platform="windows"
                        supabaseClient={supabaseClient!}
                        // 🔧 FIX: Pass supabaseUrl and supabaseKey to Onboarding (needed for AuthScreen get-user-by-workspace)
                        supabaseUrl={supabaseUrl}
                        supabaseKey={supabaseAnonKey}
                        useNewAuthFlow={true}
                        onComplete={handleNewOnboardingComplete}
                        onValidateToken={async (token: string) => {
                            const result = await config.validateNotionToken(token);
                            return result?.success ?? false;
                        }}
                        onStartTrial={handleStartTrial}
                        onUpgradeNow={handleUpgradeNow}
                        onStayFree={handleStayFree}
                    />
                </Layout>
            </ErrorBoundary>
        );
    }

    // ============================================
    // RENDU CONDITIONNEL - CHARGEMENT INITIAL
    // ============================================

    if (loading && !onboardingCompleted) {
        return (
            <ErrorBoundary>
                <LoadingScreen message="Initialisation de l'application..." />
            </ErrorBoundary>
        );
    }

    // ============================================
    // RENDU PRINCIPAL - INTERFACE COMPLÈTE
    // ============================================

    return (
        <ErrorBoundary>
            <Layout>
                <Header
                    onOpenConfig={() => setShowConfig(true)}
                    onToggleSidebar={() => setSidebarCollapsed((prev: boolean) => !prev)}
                    sidebarCollapsed={sidebarCollapsed}
                    isPinned={windowPreferences.isPinned}
                    onTogglePin={windowPreferences.togglePin}
                    isMinimalist={windowPreferences.isMinimalist}
                    onToggleMinimalist={windowPreferences.toggleMinimalist}
                    onMinimize={handleMinimize}
                    onMaximize={handleMaximize}
                    onClose={handleClose}
                    isConnected={networkStatus.isOnline}
                    pendingCount={pendingCount}
                    errorCount={errorCount}
                    onStatusClick={handleStatusClick}
                    selectedPage={selectedPage}
                    quotaSummary={quotasData}
                    subscriptionTier={subscriptionData?.tier || SubscriptionTier.FREE}
                    onUpgradeClick={() => setShowUpgradeModal(true)}
                    // 🆕 Quota checks pour Focus/Compact Mode
                    onFocusModeCheck={checkFocusModeQuota}
                    onCompactModeCheck={checkCompactModeQuota}
                    onQuotaExceeded={(feature) => handleShowUpgradeModal(feature, true)}
                />

                <div className="flex-1 flex overflow-hidden">
                    {!sidebarCollapsed ? (
                        <ResizableLayout
                            leftPanel={
                                <MemoizedPageList
                                    filteredPages={pages.filteredPages}
                                    selectedPage={selectedPage}
                                    selectedPages={selectedPages}
                                    multiSelectMode={multiSelectMode}
                                    favorites={pages.favorites}
                                    searchQuery={pages.searchQuery}
                                    activeTab={pages.activeTab}
                                    onPageSelect={handlePageSelect}
                                    onToggleFavorite={pages.toggleFavorite}
                                    onSearchChange={pages.setSearchQuery}
                                    onTabChange={pages.setActiveTab}
                                    loading={pages.pagesLoading}
                                    loadingMore={pages.loadingMore}
                                    hasMorePages={pages.hasMorePages}
                                    onLoadMore={pages.loadMorePages}
                                    onDeselectAll={handleDeselectAll}
                                />
                            }
                            rightPanel={
                                <UnifiedWorkspace
                                    selectedPage={selectedPage}
                                    onPageSelect={handlePageSelect}
                                    pages={pages.pages}
                                    onSend={handleSendWithQuotaCheck}
                                    canSend={canSend}
                                    // 🆕 Nouvelles props unifiées
                                    unifiedEntries={unifiedQueueHistory.entries}
                                    onRetryEntry={unifiedQueueHistory.retry}
                                    onDeleteEntry={unifiedQueueHistory.remove}
                                    onClearAll={unifiedQueueHistory.clear}
                                    isOnline={networkStatus.isOnline}
                                    // Legacy props (fallback)
                                    queueItems={queue.queue || []}
                                    onRetryQueue={queue.retry}
                                    onRemoveFromQueue={queue.remove}
                                    historyItems={history.history || []}
                                    onRetryHistory={history.retry}
                                    onDeleteHistory={history.deleteEntry}
                                >
                                    <ContentEditor
                                        clipboard={clipboard.clipboard}
                                        editedClipboard={clipboard.editedClipboard}
                                        onEditContent={handleEditContent}
                                        onClearClipboard={handleClearClipboard}
                                        selectedPage={selectedPage}
                                        selectedPages={selectedPages}
                                        multiSelectMode={multiSelectMode}
                                        sending={sending}
                                        onSend={handleSendWithQuotaCheck}
                                        canSend={canSend}
                                        contentProperties={contentProperties}
                                        onUpdateProperties={handleUpdateProperties}
                                        showNotification={notifications.showNotification}
                                        pages={pages.pages}
                                        onDeselectPage={handleDeselectPage}
                                        config={config.config}
                                        attachedFiles={attachedFiles}
                                        onFilesChange={handleAttachedFilesChange}
                                        onFileUpload={handleFileUpload}
                                        maxFileSize={5 * 1024 * 1024}
                                        allowedFileTypes={[
                                            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
                                            'image/webp', 'image/bmp', 'image/svg+xml',
                                            'video/mp4', 'video/mov', 'video/webm',
                                            'audio/mp3', 'audio/wav', 'audio/ogg',
                                            'application/pdf'
                                        ]}
                                        selectedSections={selectedSections}
                                        onSectionSelect={onSectionSelect}
                                        // 🔒 SECURITY: File quota props
                                        fileQuotaRemaining={quotasData?.files?.remaining}
                                        onFileQuotaExceeded={() => handleShowUpgradeModal('files', true)}
                                    />
                                </UnifiedWorkspace>
                            }
                            defaultLeftSize={35}
                            minLeftSize={25}
                            minRightSize={35}
                        />
                    ) : (
                        <div className="flex-1 overflow-hidden">
                            <UnifiedWorkspace
                                selectedPage={selectedPage}
                                onPageSelect={handlePageSelect}
                                pages={pages.pages}
                                onSend={handleSendWithQuotaCheck}
                                canSend={canSend}
                                // 🆕 Nouvelles props unifiées
                                unifiedEntries={unifiedQueueHistory.entries}
                                onRetryEntry={unifiedQueueHistory.retry}
                                onDeleteEntry={unifiedQueueHistory.remove}
                                onClearAll={unifiedQueueHistory.clear}
                                isOnline={networkStatus.isOnline}
                                // Legacy props (fallback)
                                queueItems={queue.queue || []}
                                onRetryQueue={queue.retry}
                                onRemoveFromQueue={queue.remove}
                                historyItems={history.history || []}
                                onRetryHistory={history.retry}
                                onDeleteHistory={history.deleteEntry}
                            >
                                <ContentEditor
                                    clipboard={clipboard.clipboard}
                                    editedClipboard={clipboard.editedClipboard}
                                    onEditContent={handleEditContent}
                                    onClearClipboard={handleClearClipboard}
                                    selectedPage={selectedPage}
                                    selectedPages={selectedPages}
                                    multiSelectMode={multiSelectMode}
                                    sending={sending}
                                    onSend={handleSendWithQuotaCheck}
                                    canSend={canSend}
                                    contentProperties={contentProperties}
                                    onUpdateProperties={handleUpdateProperties}
                                    showNotification={notifications.showNotification}
                                    pages={pages.pages}
                                    onDeselectPage={handleDeselectPage}
                                    config={config.config}
                                    attachedFiles={attachedFiles}
                                    onFilesChange={handleAttachedFilesChange}
                                    onFileUpload={handleFileUpload}
                                    maxFileSize={5 * 1024 * 1024}
                                    allowedFileTypes={[
                                        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
                                        'image/webp', 'image/bmp', 'image/svg+xml',
                                        'video/mp4', 'video/mov', 'video/webm',
                                        'audio/mp3', 'audio/wav', 'audio/ogg',
                                        'application/pdf'
                                    ]}
                                    selectedSections={selectedSections}
                                    onSectionSelect={onSectionSelect}
                                    // 🔒 SECURITY: File quota props
                                    fileQuotaRemaining={quotasData?.files?.remaining}
                                    onFileQuotaExceeded={() => handleShowUpgradeModal('files', true)}
                                />
                            </UnifiedWorkspace>
                        </div>
                    )}
                </div>

                {/* Modales et panels */}
                <>
                    {showConfig && (
                        <ConfigPanel
                            isOpen={showConfig}
                            config={config.config}
                            onClose={() => setShowConfig(false)}
                            showNotification={notifications.showNotification}
                            onClearCache={handleClearCache}
                            onDisconnect={handleDisconnect}
                            theme={theme.theme}
                            onThemeChange={theme.setTheme}
                        />
                    )}
                </>

                <>
                    {showFileUpload && (
                        <FileUploadModal
                            isOpen={showFileUpload}
                            onClose={() => setShowFileUpload(false)}
                            onAdd={async (config) => {
                                // Track usage si fichiers uploadés
                                if (config.mode === 'local' && config.files) {
                                    await trackUsage('files', config.files.length);
                                }
                                handleFileUpload(config);
                                setShowFileUpload(false);
                            }}
                            maxSize={20 * 1024 * 1024}
                            allowedTypes={[
                                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                                'video/mp4', 'video/webm',
                                'audio/mp3', 'audio/wav',
                                'application/pdf', 'text/plain'
                            ]}
                            // 🆕 Quota checks fichiers
                            onQuotaCheck={checkFileQuota}
                            onQuotaExceeded={() => handleShowUpgradeModal('files', true)}
                        />
                    )}
                </>

                <>
                    {showHistoryPanel && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                                <div className="p-4 border-b flex justify-between items-center">
                                    <h2 className="text-lg font-semibold">Historique</h2>
                                    <button
                                        onClick={() => setShowHistoryPanel(false)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>

                {showQueuePanel && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center">
                                <h2 className="text-lg font-semibold">File d'attente</h2>
                                <button
                                    onClick={() => setShowQueuePanel(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <NotificationManager
                    notifications={notifications.notifications}
                    onClose={notifications.closeNotification}
                />

                <ShortcutsModal
                    isOpen={showShortcuts}
                    onClose={() => setShowShortcuts(false)}
                    shortcuts={shortcuts}
                />

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                            const newFiles = files.map(file => ({
                                id: Date.now() + Math.random(),
                                file,
                                name: file.name,
                                type: file.type,
                                size: file.size
                            }));
                            handleAttachedFilesChange([...attachedFiles, ...newFiles]);
                        }
                        e.target.value = '';
                    }}
                />

                {/* 🆕 Panneau d'activité unifié */}
                <UnifiedActivityPanel
                    isOpen={showActivityPanel}
                    onClose={() => setShowActivityPanel(false)}
                    entries={unifiedQueueHistory.entries}
                    onRetry={unifiedQueueHistory.retry}
                    onDelete={unifiedQueueHistory.remove}
                    onClear={unifiedQueueHistory.clear}
                    isOnline={networkStatus.isOnline}
                />

                {/* 🎯 Focus Mode Introduction Modal */}
                <>
                    {showFocusModeIntro && focusModeIntroPage && (
                        <FocusModeIntro
                            onComplete={handleFocusModeIntroComplete}
                            onSkip={handleFocusModeIntroSkip}
                        />
                    )}
                </>

                {/* 🎯 Upgrade Modal (Freemium) */}
                <UpgradeModal
                    isOpen={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    onUpgrade={async () => {
                        console.log('[App] Upgrade clicked from modal');
                        setShowUpgradeModal(false);
                        // Appeler handleUpgradeNow avec le plan mensuel par défaut
                        await handleUpgradeNow('monthly');
                    }}
                    feature={upgradeModalFeature as any}
                    quotaReached={upgradeModalQuotaReached}
                />

                {/* ❌ REMOVED: Old WelcomePremiumModal - Replaced by UpgradeModal */}

                {/* 🆕 Grace Period Urgent Modal (≤ 3 days remaining) */}
                {/* 🔥 MIGRATION: Use tier-based check instead of is_grace_period field */}
                {subscriptionData?.tier === SubscriptionTier.GRACE_PERIOD && quotasData?.grace_period_days_remaining !== null && (
                    <GracePeriodUrgentModal
                        isOpen={showGracePeriodModal}
                        daysRemaining={quotasData.grace_period_days_remaining}
                        onClose={() => setShowGracePeriodModal(false)}
                        onUpgrade={async () => {
                            console.log('[App] Upgrade from Grace Period Modal');
                            setShowGracePeriodModal(false);
                            await handleUpgradeNow('monthly');
                        }}
                    />
                )}
            </Layout>
        </ErrorBoundary>
    );
}

/**
 * App with internationalization, authentication and subscription support
 * Wraps the main App component with LocaleProvider, AuthProvider and SubscriptionProvider
 */
function AppWithProviders() {
    // Si Supabase n'est pas configuré, afficher un warning mais continuer
    if (!supabaseClient) {
        console.warn('[App] Supabase client not configured. Auth and subscription features will be disabled.');
    }

    return (
        <LocaleProvider>
            {supabaseClient ? (
                <AuthProvider supabaseClient={supabaseClient}>
                    <SubscriptionProvider
                        getSupabaseClient={() => supabaseClient}
                        supabaseUrl={supabaseUrl}
                        supabaseKey={supabaseAnonKey}
                    >
                        <App />
                    </SubscriptionProvider>
                </AuthProvider>
            ) : (
                <App />
            )}
        </LocaleProvider>
    );
}

export default AppWithProviders;