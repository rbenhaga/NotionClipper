// apps/notion-clipper-app/src/react/src/App.tsx - VERSION OPTIMISÉE ET MODULAIRE
import React, { memo, useState, useEffect, useCallback, useRef } from 'react';

// Initialize backend configuration
import './config/backend';
import { BACKEND_API_URL, WEBSITE_URL } from './config/backend';

// 🔒 SECURITY: Check if running in Electron (not in browser)
// 🔧 FIX P0 #1: Guard window access for SSR/tests - NO top-level redirect (causes issues in tests/SSR)
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
// Note: Browser redirect is handled by BrowserBlockedScreen component, not at module load time

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

// Slate editor styles are included in the plate-adapter package
// They will be bundled automatically when the component is used

// i18n
import { LocaleProvider } from '@notion-clipper/i18n';

// 🔧 FIX: Use singleton Supabase client to avoid "Multiple GoTrueClient instances" warning
import { getSupabaseClient, getSupabaseUrl, getSupabaseAnonKey } from './lib/supabase';

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();
const supabaseClient = getSupabaseClient();

console.log('[App] 🔧 Supabase URL:', supabaseUrl);
console.log('[App] 🔧 Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing');

// Imports depuis packages/ui
import {
    Onboarding,
    Layout,
    Header,
    ContentArea,
    PageList,
    ContentEditor,
    EnhancedContentEditor,
    SettingsPage, // 🆕 Remplace ConfigPanel
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
    analytics,
    OfflineBanner,
    // 🎨 Design System V2 - Density
    DensityProvider
} from '@notion-clipper/ui';

// Import SubscriptionTier from core-shared
import { SubscriptionTier } from '@notion-clipper/core-shared';

// Composants mémorisés
const MemoizedPageList = memo(PageList);
const MemoizedMinimalistView = memo(MinimalistView);

// 🔒 SECURITY: Fallback component for browser access
const BrowserBlockedScreen = () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-4">
                Desktop App Only
            </h1>
            <p className="text-gray-400 mb-6">
                This application is designed to run as a desktop app, not in a web browser.
                Please download and install Clipper Pro to use it.
            </p>
            <a 
                href={WEBSITE_URL || 'https://clipperpro.app'}
                className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
            >
                Go to Website
            </a>
        </div>
    </div>
);

/**
 * Composant principal de l'application Clipper Pro
 * Version optimisée utilisant le hook composite useAppState
 */
function App() {
    // 🔒 SECURITY: Block browser access
    if (!isElectron) {
        return <BrowserBlockedScreen />;
    }
    // 🆕 Subscription context pour afficher les quotas dans Header
    const subscriptionContext = useSubscriptionContext();
    const [subscriptionData, setSubscriptionData] = useState<any>(null);
    const [quotasData, setQuotasData] = useState<any>(null);
    
    // 🎯 État pour attendre que tout soit prêt après l'onboarding
    const [isAppReady, setIsAppReady] = useState(false);
    const [quotaLoadError, setQuotaLoadError] = useState<string | null>(null);
    const [quotaErrorType, setQuotaErrorType] = useState<'retryable' | 'fatal' | null>(null);
    const [quotaRetryAttempt, setQuotaRetryAttempt] = useState(0);
    const quotaMaxRetries = 8; // Max 8 tentatives (~30s total avec backoff)
    const quotaLoadInFlightRef = useRef(false); // 🔒 Lock anti-parallèle

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

    // 🔧 FIX: Flag to prevent multiple onboarding completions
    const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);

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
                        // Note: NotionService reinitialization is handled by useAppInitialization hook
                        // to avoid duplicate calls
                        if (!authData.notionToken) {
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

    // 🔧 FIX: Global guard to prevent handling the same auth callback twice
    // This is needed because Onboarding.tsx and App.tsx both listen to auth:callback
    const hasHandledAuthCallbackRef = useRef(false);

    // 🔧 FIX: Listen for auth:callback from deep link to handle auth completion
    // ONLY when onboarding is NOT showing (WebAuthScreen handles it during onboarding)
    useEffect(() => {
        // 🔧 FIX: Don't listen if onboarding is showing - WebAuthScreen handles it
        if (showOnboarding) {
            console.log('[App] ℹ️ Onboarding is showing, WebAuthScreen will handle auth:callback');
            return;
        }

        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.on) return;

        const handleAuthCallback = async (data: {
            token?: string;
            userId?: string;
            email?: string;
            hasNotionWorkspace?: boolean;
            notionWorkspace?: { id: string; name: string; icon?: string };
            notionToken?: string; // 🔧 FIX: main.ts now sends notionToken directly
            success?: boolean;
            error?: string;
        }) => {
            // 🔧 FIX: Skip if already handled (by Onboarding.tsx or previous call)
            if (hasHandledAuthCallbackRef.current) {
                console.log('[App] ⏭️ auth:callback already handled, skipping');
                return;
            }

            console.log('[App] 🔗 Received auth:callback from deep link (post-onboarding):', {
                userId: data.userId,
                email: data.email,
                hasNotionWorkspace: data.hasNotionWorkspace,
                hasNotionToken: !!data.notionToken,
                success: data.success
            });

            if (data.success && data.userId) {
                // Mark as handled
                hasHandledAuthCallbackRef.current = true;
                // 🔧 FIX: Check if we have Notion workspace from the callback data directly
                // main.ts already fetched everything from /api/user/app-data
                if (data.hasNotionWorkspace && data.notionWorkspace) {
                    console.log('[App] 🎯 User has Notion workspace from callback, updating...');
                    
                    // Get the Notion token from Electron config (main.ts saved it)
                    let notionToken = data.notionToken;
                    if (!notionToken) {
                        notionToken = await electronAPI.invoke?.('config:get', 'notionToken');
                    }
                    
                    if (notionToken) {
                        console.log('[App] ✅ Notion token available');
                        
                        // Reinitialize NotionService
                        try {
                            const reinitResult = await electronAPI.invoke?.('notion:reinitialize-service', notionToken);
                            if (reinitResult?.success) {
                                console.log('[App] ✅ NotionService reinitialized');
                                
                                // Load pages
                                await pages.loadPages();
                                console.log('[App] ✅ Pages loaded');
                            }
                        } catch (error) {
                            console.error('[App] Error reinitializing NotionService:', error);
                        }
                        
                        // Update AuthDataManager
                        const currentData = authDataManager.getCurrentData();
                        await authDataManager.saveAuthData({
                            userId: data.userId,
                            email: data.email || currentData?.email || '',
                            fullName: currentData?.fullName || null,
                            avatarUrl: currentData?.avatarUrl || null,
                            authProvider: currentData?.authProvider || 'notion',
                            notionToken: notionToken,
                            notionWorkspace: data.notionWorkspace,
                            onboardingCompleted: true
                        });
                        
                        notifications.showNotification('Connexion réussie !', 'success');
                    } else {
                        console.warn('[App] ⚠️ Workspace exists but no token found');
                    }
                } else {
                    // User authenticated but no Notion workspace
                    console.log('[App] ℹ️ User authenticated but no Notion workspace');
                }
            } else if (data.error) {
                console.error('[App] ❌ Auth callback error:', data.error);
                notifications.showNotification(data.error, 'error');
            }
        };

        electronAPI.on('auth:callback', handleAuthCallback);

        return () => {
            electronAPI.off?.('auth:callback', handleAuthCallback);
        };
    }, [showOnboarding, pages, notifications]);

    // 🔧 FIX: Load quotas when services become initialized (especially after onboarding)
    // 🎯 CRITICAL: Quotas are REQUIRED - app cannot function without them
    // 🆕 Auto-retry with exponential backoff + proper error handling + cleanup
    useEffect(() => {
        // Skip if already ready
        if (isAppReady) return;
        if (!onboardingCompleted) return;
        if (!subscriptionContext?.isServicesInitialized) return;
        
        // 🔧 FIX P1: Check max retries FIRST, then fatal state
        // This ensures we always set the error state atomically before returning
        // Prevents edge case where quotaErrorType='fatal' but quotaLoadError=null
        
        // Handle max retries reached - ensure fatal state is set atomically
        if (quotaRetryAttempt >= quotaMaxRetries) {
            if (quotaErrorType !== 'fatal' || !quotaLoadError) {
                setQuotaErrorType('fatal');
                setQuotaLoadError('Impossible de récupérer vos quotas après plusieurs tentatives.');
            }
            return;
        }
        
        // Skip if already in fatal state (with error message set)
        if (quotaErrorType === 'fatal' && quotaLoadError) return;
        
        // 🔒 Lock: prevent parallel calls
        if (quotaLoadInFlightRef.current) {
            console.log('[App] ⏸️ Quota load already in flight, skipping');
            return;
        }

        let cancelled = false;
        let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
        
        // Helper: check if error is retryable
        const isRetryableError = (error: any): boolean => {
            const status = error?.status || error?.response?.status || error?.code;
            const message = (error?.message || '').toLowerCase();
            const errorName = (error?.name || '').toLowerCase();
            
            // NON-RETRYABLE errors (fatal - stop immediately)
            if (status === 401 || status === 403) {
                console.error('[App] 🔐 Auth error (401/403) - session invalid');
                return false;
            }
            if (status === 400) {
                console.error('[App] 🐛 Bad request (400) - likely a bug');
                return false;
            }
            if (message.includes('no userid') || message.includes('not initialized') || message.includes('authentication required')) {
                console.error('[App] 🐛 Missing userId or not initialized - flow bug');
                return false;
            }
            
            // RETRYABLE errors (network issues, server errors)
            // Network errors (fetch failures, DNS, connection refused)
            if (errorName === 'typeerror' || message.includes('failed to fetch') || message.includes('network') || message.includes('econnrefused') || message.includes('timeout')) {
                console.log('[App] 🌐 Network error - retryable');
                return true;
            }
            // Server errors (5xx)
            if (status >= 500 && status < 600) {
                console.log('[App] 🔥 Server error (5xx) - retryable');
                return true;
            }
            // Rate limit
            if (status === 429) {
                console.log('[App] ⏱️ Rate limited (429) - retryable');
                return true;
            }
            
            // Unknown error - assume retryable (safer than blocking user)
            console.log('[App] ❓ Unknown error type - assuming retryable');
            return true;
        };

        const loadWithRetry = async () => {
            // Set lock BEFORE async work
            quotaLoadInFlightRef.current = true;
            
            const currentAttempt = quotaRetryAttempt + 1;
            console.log(`[App] 🎯 Loading quotas (attempt ${currentAttempt}/${quotaMaxRetries})...`);
            setQuotaLoadError(null);
            setQuotaErrorType(null);
            
            try {
                subscriptionContext.subscriptionService.invalidateCache();
                subscriptionContext.quotaService.invalidateCache();
                
                const [sub, quotaSummary] = await Promise.all([
                    subscriptionContext.subscriptionService.getCurrentSubscription(),
                    subscriptionContext.quotaService.getQuotaSummary(),
                ]);

                // 🛡️ Check if cancelled before updating state
                if (cancelled) {
                    console.log('[App] ⚠️ Quota load cancelled, ignoring result');
                    return;
                }

                setSubscriptionData(sub);
                setQuotasData(quotaSummary);
                
                console.log('[App] ✅ Quotas loaded:', { tier: sub?.tier, clips: quotaSummary?.clips });
                
                // 🔧 FIX #2: Reset retry counter on success (clean state for future)
                setQuotaRetryAttempt(0);
                setIsAppReady(true);
            } catch (error: any) {
                // 🛡️ Check if cancelled before updating state
                if (cancelled) {
                    console.log('[App] ⚠️ Quota load cancelled, ignoring error');
                    return;
                }
                
                console.error(`[App] ❌ Failed to load quotas (attempt ${currentAttempt}):`, error);
                
                // Check if error is retryable
                if (!isRetryableError(error)) {
                    // FATAL: Non-retryable error - stop immediately
                    console.error('[App] 💀 Non-retryable error, showing fatal screen');
                    setQuotaErrorType('fatal');
                    setQuotaLoadError(
                        error?.status === 401 || error?.status === 403
                            ? 'Session expirée. Veuillez vous reconnecter.'
                            : 'Erreur de configuration. Veuillez relancer l\'application.'
                    );
                    setQuotaRetryAttempt(quotaMaxRetries); // Force max to stop retries
                } else if (currentAttempt >= quotaMaxRetries) {
                    // Max retries reached for retryable error - mark as FATAL
                    console.error('[App] 💀 Max retries exhausted');
                    setQuotaErrorType('fatal');
                    setQuotaLoadError('Impossible de récupérer vos quotas après plusieurs tentatives.');
                    setQuotaRetryAttempt(currentAttempt);
                } else {
                    // Schedule retry with backoff
                    const backoff = Math.min(1000 * Math.pow(2, currentAttempt - 1), 8000);
                    const jitter = Math.floor(Math.random() * 250);
                    const delay = backoff + jitter;
                    
                    console.log(`[App] 🔄 Retrying in ${delay}ms (attempt ${currentAttempt + 1})...`);
                    
                    // 🔧 FIX: Use functional update to guarantee increment
                    retryTimeoutId = setTimeout(() => {
                        if (!cancelled) {
                            setQuotaRetryAttempt(prev => prev + 1);
                        }
                    }, delay);
                }
            } finally {
                // 🔒 Always release lock, even on early return
                quotaLoadInFlightRef.current = false;
            }
        };
        
        loadWithRetry();
        
        // 🧹 Cleanup: cancel pending operations on unmount or deps change
        return () => {
            cancelled = true;
            if (retryTimeoutId) {
                clearTimeout(retryTimeoutId);
            }
        };
    // 🔧 FIX #4: Include subscriptionContext in deps to avoid stale closure
    // The context object itself is stable (from useContext), but we depend on its services
    }, [subscriptionContext, onboardingCompleted, isAppReady, quotaRetryAttempt, quotaErrorType]);

    // 🔧 FIX #3: Reset quota retry state when auth context changes (logout/login, new user)
    // This prevents being stuck at maxRetries after a re-auth or user switch
    // ⚠️ IMPORTANT: Use reactive state (not authDataManager.getCurrentData() which doesn't trigger re-render)
    const [currentUserId, setCurrentUserId] = useState<string | undefined>(
        () => authDataManager.getCurrentData()?.userId
    );
    const prevUserIdRef = useRef<string | undefined>(currentUserId);
    
    // Listen to auth-data-changed event to update currentUserId reactively
    // 🔧 FIX RISK #2: Use event payload to avoid unnecessary getCurrentData calls
    useEffect(() => {
        const handleAuthChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ userId?: string | null }>;
            // Use userId from event payload if available
            const newUserId = customEvent.detail?.userId ?? authDataManager.getCurrentData()?.userId;
            console.log('[App] 🔔 auth-data-changed event, userId:', newUserId?.substring(0, 8));
            setCurrentUserId(newUserId ?? undefined);
        };
        
        window.addEventListener('auth-data-changed', handleAuthChange);
        return () => window.removeEventListener('auth-data-changed', handleAuthChange);
    }, []);
    
    // Reset quota state when userId changes or context resets
    useEffect(() => {
        const userChanged = currentUserId !== prevUserIdRef.current;
        prevUserIdRef.current = currentUserId;
        
        // Reset when:
        // - services not initialized (logout)
        // - onboarding not completed (new flow)
        // - userId changed (account switch)
        const shouldReset = !subscriptionContext?.isServicesInitialized || !onboardingCompleted || userChanged;
        
        if (shouldReset && (quotaRetryAttempt > 0 || quotaLoadError || quotaErrorType || (userChanged && isAppReady))) {
            console.log('[App] 🔄 Resetting quota retry state', { 
                reason: userChanged ? 'user_changed' : 'context_reset',
                userId: currentUserId?.substring(0, 8) 
            });
            setQuotaRetryAttempt(0);
            setQuotaLoadError(null);
            setQuotaErrorType(null);
            if (userChanged) {
                setIsAppReady(false);
            }
        }
    }, [subscriptionContext?.isServicesInitialized, onboardingCompleted, currentUserId, quotaRetryAttempt, quotaLoadError, quotaErrorType, isAppReady]);

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
    // 🔧 FIX: notionToken and workspace can be undefined (user authenticated without Notion)
    const handleNewOnboardingComplete = useCallback(async (data: {
        userId: string;
        email: string;
        notionToken?: string;
        workspace?: { id: string; name: string; icon?: string }
    }) => {
        // 🔧 FIX: Prevent multiple calls
        if (isCompletingOnboarding) {
            console.log('[App] ⚠️ Already completing onboarding, ignoring duplicate call');
            return;
        }
        setIsCompletingOnboarding(true);

        console.log('[App] 🎯 New onboarding completed:', {
            userId: data.userId,
            email: data.email,
            hasNotionToken: !!data.notionToken,
            hasWorkspace: !!data.workspace
        });

        // 🔧 FIX: Show loading indicator during onboarding completion
        setSending(true);

        // 🔧 FIX BUG #1 - Marquer l'onboarding comme complété via AuthDataManager
        try {
            console.log('[App] 💾 Updating auth data with completion status...');

            const authData = authDataManager.getCurrentData();
            if (authData) {
                await authDataManager.saveAuthData({
                    ...authData,
                    notionToken: data.notionToken || undefined,
                    notionWorkspace: data.workspace || undefined,
                    onboardingCompleted: true // ← Marquer comme complété
                });

                console.log('[App] ✅ Auth data updated with onboarding completion');
            }
        } catch (error) {
            console.error('[App] ⚠️ Failed to update auth data:', error);
        }

        // 1. Sauvegarder le token Notion dans la notion_connection (ONLY if we have Notion data)
        if (supabaseClient && data.notionToken && data.workspace) {
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
        } else if (!data.notionToken) {
            // 🔧 FIX: This should not happen anymore since Notion is configured on the website
            // before redirecting to the app. But handle it gracefully just in case.
            console.log('[App] ⚠️ User completed onboarding without Notion token (unexpected)');
            console.log('[App] ℹ️ User should configure Notion on the website');
            
            // Show a notification instead of opening the website
            notifications.showNotification(
                'Veuillez configurer votre workspace Notion sur le site web pour utiliser l\'application.',
                'warning'
            );
        }

        // 2. Initialize subscription services (quota loading is handled by useEffect)
        // 🔧 FIX: Manually initialize services if not yet done (don't rely on event)
        if (subscriptionContext && !subscriptionContext.isServicesInitialized) {
            console.log('[App] 🚀 Manually initializing subscription services...');
            try {
                await subscriptionContext.initializeServices(data.userId);
                console.log('[App] ✅ Subscription services initialized');
                // Note: useEffect will automatically load quotas when isServicesInitialized becomes true
            } catch (error) {
                console.error('[App] ⚠️ Failed to initialize subscription services:', error);
            }
        }

        // 3. Sauvegarder le token localement (backward compatibility) - only if we have a token
        if (data.notionToken && data.workspace) {
            const shouldShowModal = await handleCompleteOnboarding(data.notionToken, data.workspace);

            console.log('[App] 🎯 handleCompleteOnboarding returned:', shouldShowModal);

            // 4. Afficher le WelcomePremiumModal
            if (shouldShowModal === true) {
                console.log('[App] 🎉 Showing WelcomePremiumModal after onboarding');
                setTimeout(() => {
                    setShowWelcomePremiumModal(true);
                }, 500); // Petit délai pour une transition fluide
            }
        } else {
            // No Notion token - just complete onboarding UI
            console.log('[App] 🎯 Completing onboarding without Notion (user can configure later)');
            setShowOnboarding(false);
            setOnboardingCompleted(true);
            
            // Show notification to guide user
            notifications.showNotification(
                'Connectez votre workspace Notion sur le site pour commencer à clipper !',
                'info'
            );
        }

        // 🔧 FIX: Reset loading indicators
        setSending(false);
        setIsCompletingOnboarding(false);
    }, [handleCompleteOnboarding, supabaseClient, subscriptionContext, notifications, setShowOnboarding, setOnboardingCompleted, isCompletingOnboarding]);

    // 🔄 ANCIEN HANDLER - Pour backward compatibility (ancien flow)
    const handleCompleteOnboardingWithModal = useCallback(async (token: string, workspace?: { id: string; name: string; icon?: string }) => {
        console.log('[App] 🎯 OLD flow - Completing onboarding with workspace:', workspace);

        // 🔧 FIX CRITICAL: Get userId from Electron config (saved by main.ts during auth:callback)
        // This is needed because authDataManager doesn't have the data yet during onboarding
        let userId: string | null = null;
        let email: string | null = null;
        try {
            const electronAPI = (window as any).electronAPI;
            userId = await electronAPI?.invoke?.('config:get', 'userId');
            email = await electronAPI?.invoke?.('config:get', 'userEmail');
            console.log('[App] 🔑 Retrieved userId from Electron config:', userId?.substring(0, 8) + '...');
        } catch (error) {
            console.warn('[App] ⚠️ Could not get userId from Electron config:', error);
        }

        // 🔧 FIX: Save auth data to authDataManager BEFORE calling handleCompleteOnboarding
        // This ensures subscription services can be initialized with the userId
        if (userId && token) {
            console.log('[App] 💾 Saving auth data to AuthDataManager...');
            await authDataManager.saveAuthData({
                userId,
                email: email || '',
                fullName: null,
                avatarUrl: null,
                authProvider: 'notion',
                notionToken: token,
                notionWorkspace: workspace,
                onboardingCompleted: true
            });
            console.log('[App] ✅ Auth data saved to AuthDataManager');
        }

        // Appeler le handler original pour sauvegarder le token et charger les pages
        const shouldShowModal = await handleCompleteOnboarding(token, workspace);

        console.log('[App] 🎯 handleCompleteOnboarding returned:', shouldShowModal);

        // 🔧 FIX: Initialize subscription services after onboarding completes
        // Note: useEffect will automatically load quotas when isServicesInitialized becomes true
        const authData = authDataManager.getCurrentData();
        const finalUserId = authData?.userId || userId;
        
        if (finalUserId && subscriptionContext && !subscriptionContext.isServicesInitialized) {
            console.log('[App] 🚀 Manually initializing subscription services (OLD flow)...');
            try {
                await subscriptionContext.initializeServices(finalUserId);
                console.log('[App] ✅ Subscription services initialized');
                // Note: useEffect will automatically load quotas when isServicesInitialized becomes true
            } catch (error) {
                console.error('[App] ⚠️ Failed to initialize subscription services:', error);
            }
        } else if (!finalUserId) {
            console.warn('[App] ⚠️ No userId available for subscription services');
        }

        // Afficher la modal WelcomePremium
        if (shouldShowModal === true && workspace) {
            console.log('[App] 🎉 Showing WelcomePremiumModal after onboarding');
            setTimeout(() => {
                setShowWelcomePremiumModal(true);
            }, 500);
        }
    }, [handleCompleteOnboarding, subscriptionContext]);

    // 🔧 FIX P0 #2: Helper to get auth token - SINGLE SOURCE OF TRUTH (Supabase session only)
    // No localStorage fallback - if no session, user is not authenticated
    const getAuthToken = async (): Promise<string> => {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('[App] ❌ Error getting Supabase session:', error);
            throw new Error(`Authentication error: ${error.message}`);
        }
        
        if (!session?.access_token) {
            throw new Error('User not authenticated - no valid session');
        }
        
        return session.access_token;
    };

    // 🆕 Handler pour démarrer l'essai gratuit (14 jours)
    const handleStartTrial = async () => {
        console.log('[App] 🚀 Starting 14-day trial...');

        try {
            const token = await getAuthToken();

            console.log('[App] Creating checkout via backend...');

            // 🔧 MIGRATED: Use NotionClipperWeb backend instead of Edge Function
            const response = await fetch(`${BACKEND_API_URL}/stripe/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    plan: 'premium_monthly',
                    trial: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[App] Backend error:', response.status, errorData);
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data?.data?.url) {
                // Ouvrir le Stripe Checkout dans le navigateur
                console.log('[App] Opening Stripe Checkout:', data.data.url);
                await (window as any).electronAPI?.invoke('open-external', data.data.url);

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
            const token = await getAuthToken();

            console.log('[App] Creating checkout via backend, plan:', plan);

            // 🆕 Track analytics: Checkout Started
            analytics.trackCheckoutStarted({ plan });

            // 🔧 MIGRATED: Use NotionClipperWeb backend instead of Edge Function
            const planId = plan === 'yearly' ? 'premium_yearly' : 'premium_monthly';
            const response = await fetch(`${BACKEND_API_URL}/stripe/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    plan: planId,
                    trial: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[App] Backend error:', response.status, errorData);
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data?.data?.url) {
                // Ouvrir le Stripe Checkout dans le navigateur
                console.log('[App] Opening Stripe Checkout:', data.data.url);
                await (window as any).electronAPI?.invoke('open-external', data.data.url);

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
            // 🔧 FIX: Invalider les deux caches pour s'assurer d'avoir des données fraîches
            subscriptionContext.subscriptionService.invalidateCache();
            subscriptionContext.quotaService.invalidateCache();

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
                    new Notification('Clipper Pro', {
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

    // 🔧 FIX P0: Clear cache - ONLY remove known cache keys, NOT auth/session keys
    // Previous approach (remove all except whitelist) was dangerous:
    // - Could delete Supabase session keys (sb-*-auth-token)
    // - Could break auth state while keeping user_id → inconsistent state
    const handleClearCache = async () => {
        try {
            if (!window.electronAPI) {
                throw new Error('ElectronAPI not available');
            }
            
            console.log('[App] 🧹 Starting cache clear (safe mode)...');
            
            // 1. Clear Electron caches via IPC (the main cache clearing)
            await window.electronAPI.invoke('cache:clear');
            console.log('[App] ✅ Electron cache cleared');
            
            // 2. Clear TOC/blocks cache
            try {
                await window.electronAPI.invoke('notion:clear-all-blocks-cache');
                console.log('[App] ✅ TOC/blocks cache cleared');
            } catch (tocError) {
                console.warn('[App] ⚠️ Could not clear TOC cache:', tocError);
            }
            
            // 3. Clear suggestion cache
            try {
                await window.electronAPI.invoke('suggestion:clear-cache');
                console.log('[App] ✅ Suggestion cache cleared');
            } catch (suggestionError) {
                console.warn('[App] ⚠️ Could not clear suggestion cache:', suggestionError);
            }
            
            // 4. Clear page cache
            try {
                await window.electronAPI.invoke('page:clear-cache');
                console.log('[App] ✅ Page cache cleared');
            } catch (pageError) {
                console.warn('[App] ⚠️ Could not clear page cache:', pageError);
            }
            
            // 5. Clear ONLY known app cache keys in localStorage
            // ⚠️ IMPORTANT: Do NOT clear all keys - this would delete:
            // - Supabase session (sb-*-auth-token) → breaks getAuthToken()
            // - Auth keys → inconsistent state
            const cacheKeysToRemove = [
                'offline-queue',
                'offline-history',
                'notion-clipper-cache',
                'pages-cache',
                'quota-cache',
                'windowPreferences'
            ];
            cacheKeysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Also remove any prefixed cache keys
            const cachePrefixes = ['cache:', 'notion-cache:', 'pages-'];
            Object.keys(localStorage).forEach(key => {
                if (cachePrefixes.some(prefix => key.startsWith(prefix))) {
                    localStorage.removeItem(key);
                }
            });
            console.log('[App] ✅ localStorage caches cleared (auth/session preserved)');
            
            console.log('[App] 🎉 Cache clear finished');
            notifications.showNotification('Cache vidé avec succès', 'success');
            
            // Reload to refresh all state cleanly
            window.location.reload();
        } catch (error: any) {
            console.error('[handleClearCache] Error:', error);
            notifications.showNotification(`Erreur lors du vidage du cache: ${error.message}`, 'error');
        }
    };

    // 🔧 FIX P0 #3: Simplified disconnect - AuthDataManager is the SINGLE source of truth
    // Rule: Disconnect = clear auth + onboarding + token + subscription state + app caches
    // AuthDataManager.clearAuthData() handles: memory + localStorage auth keys + Electron config auth keys
    const handleDisconnect = async () => {
        try {
            console.log('[App] 🧹 Starting disconnect...');

            // 🔧 FIX: Reset auth callback guard to allow new login
            hasHandledAuthCallbackRef.current = false;

            // 1. Sign out from Supabase (invalidates session)
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
                console.log('[App] ✅ Supabase session signed out');
            }

            // 2. Clear auth data via AuthDataManager (SINGLE SOURCE OF TRUTH)
            // This handles: memory cache + localStorage auth keys + Electron config auth keys
            // Also dispatches 'auth-data-changed' event to reset SubscriptionContext
            await authDataManager.clearAuthData();
            console.log('[App] ✅ Auth data cleared via AuthDataManager');

            // 3. Clear app-specific caches in localStorage (NOT auth keys - AuthDataManager handles those)
            // These are business caches that should be cleared on disconnect
            const appCacheKeys = [
                'offline-queue',
                'offline-history', 
                'windowPreferences',
                'notion-clipper-cache'
            ];
            appCacheKeys.forEach(key => localStorage.removeItem(key));
            sessionStorage.clear();
            console.log('[App] ✅ App caches cleared');

            // 4. Clear Electron caches (NOT config:reset - that's too aggressive)
            // Only clear business caches, not user preferences
            if (window.electronAPI?.invoke) {
                try {
                    await window.electronAPI.invoke('cache:clear');
                    console.log('[App] ✅ Electron cache cleared');
                } catch (e) {
                    console.warn('[App] ⚠️ Could not clear Electron cache:', e);
                }
            }

            console.log('[App] ✅ Disconnect complete');
            notifications.showNotification('Déconnecté avec succès', 'success');

            // Reload to return to onboarding
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            console.error('[handleDisconnect] Error:', error);
            notifications.showNotification(`Erreur: ${error.message}`, 'error');
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
                        onRefreshQuotas={refreshQuotaData}
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

                    {/* 🆕 NEW: SettingsPage - Full-page settings with navigation */}
                    <SettingsPage
                        isOpen={showConfig}
                        onClose={() => setShowConfig(false)}
                        config={config.config}
                        theme={theme.theme}
                        onThemeChange={theme.setTheme}
                        onClearCache={handleClearCache}
                        onDisconnect={handleDisconnect}
                        showNotification={notifications.showNotification}
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
                        useNewAuthFlow={false}
                        onComplete={handleCompleteOnboardingWithModal}
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
    // 🎯 RENDU CONDITIONNEL - CHARGEMENT POST-ONBOARDING
    // Attend que les services soient initialisés et les quotas chargés
    // ⚠️ CRITICAL: Les quotas sont OBLIGATOIRES - l'app ne peut pas fonctionner sans
    // ============================================

    if (onboardingCompleted && !isAppReady) {
        // 💀 Écran d'erreur FATAL
        if (quotaLoadError && (quotaErrorType === 'fatal' || quotaRetryAttempt >= quotaMaxRetries)) {
            const isAuthError = quotaErrorType === 'fatal' && quotaLoadError.includes('Session');
            const isNetworkError = quotaErrorType === 'retryable';
            
            return (
                <ErrorBoundary>
                    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-8">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                                isAuthError 
                                    ? 'bg-orange-100 dark:bg-orange-900/30' 
                                    : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                                <X size={32} className={isAuthError ? 'text-orange-500' : 'text-red-500'} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {isAuthError ? 'Session expirée' : 'Connexion impossible'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {quotaLoadError}
                            </p>
                            
                            {/* Conseils selon le type d'erreur */}
                            <div className="text-left text-sm text-gray-500 dark:text-gray-400 mb-6 space-y-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                {isNetworkError ? (
                                    <>
                                        <p>• Vérifiez votre connexion internet</p>
                                        <p>• Le serveur peut être temporairement indisponible</p>
                                        <p>• Si le problème persiste, réessayez plus tard</p>
                                    </>
                                ) : isAuthError ? (
                                    <>
                                        <p>• Votre session a expiré</p>
                                        <p>• Relancez l'app pour vous reconnecter</p>
                                    </>
                                ) : (
                                    <>
                                        <p>• Une erreur inattendue s'est produite</p>
                                        <p>• Relancez l'app pour réessayer</p>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex gap-3">
                                {isAuthError ? (
                                    // Auth error: propose to reconnect (clear auth + reload)
                                    <button
                                        onClick={async () => {
                                            try {
                                                await authDataManager.clearAuthData();
                                            } catch (e) { /* ignore */ }
                                            window.location.reload();
                                        }}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all"
                                    >
                                        Se reconnecter
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
                                    >
                                        Relancer l'app
                                    </button>
                                )}
                                <button
                                    onClick={() => window.electronAPI?.closeWindow?.()}
                                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    Quitter
                                </button>
                            </div>
                        </div>
                    </div>
                </ErrorBoundary>
            );
        }

        // 🔄 Écran de chargement avec progression des tentatives
        const loadingMessage = quotaRetryAttempt > 0 
            ? `Synchronisation... (tentative ${quotaRetryAttempt + 1}/${quotaMaxRetries})`
            : "Chargement de vos données...";
            
        return (
            <ErrorBoundary>
                <LoadingScreen message={loadingMessage} />
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
                    onRefreshQuotas={refreshQuotaData}
                />

                {/* 🆕 Bannière offline visible quand hors ligne ou éléments en attente */}
                <OfflineBanner
                    isOnline={networkStatus.isOnline}
                    pendingCount={pendingCount}
                    errorCount={errorCount}
                    onRetryConnection={unifiedQueueHistory.forceNetworkCheck}
                    onViewQueue={handleStatusClick}
                    isRetrying={unifiedQueueHistory.isProcessing}
                    subscriptionTier={subscriptionData?.tier}
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
                                    <EnhancedContentEditor
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
                                        showNotification={notifications.showNotification}
                                        pages={pages.pages}
                                        onPageSelect={handlePageSelect}
                                        onDeselectPage={handleDeselectPage}
                                        config={config.config}
                                        attachedFiles={attachedFiles}
                                        onFilesChange={handleAttachedFilesChange}
                                        onFileUpload={handleFileUpload}
                                        maxFileSize={5 * 1024 * 1024}
                                        selectedSections={selectedSections}
                                        onSectionSelect={onSectionSelect}
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
                                <EnhancedContentEditor
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
                                    showNotification={notifications.showNotification}
                                    pages={pages.pages}
                                    onPageSelect={handlePageSelect}
                                    onDeselectPage={handleDeselectPage}
                                    config={config.config}
                                    attachedFiles={attachedFiles}
                                    onFilesChange={handleAttachedFilesChange}
                                    onFileUpload={handleFileUpload}
                                    maxFileSize={5 * 1024 * 1024}
                                    selectedSections={selectedSections}
                                    onSectionSelect={onSectionSelect}
                                    fileQuotaRemaining={quotasData?.files?.remaining}
                                    onFileQuotaExceeded={() => handleShowUpgradeModal('files', true)}
                                />
                            </UnifiedWorkspace>
                        </div>
                    )}
                </div>

                {/* 🆕 NEW: SettingsPage - Full-page settings with navigation */}
                <SettingsPage
                    isOpen={showConfig}
                    onClose={() => setShowConfig(false)}
                    config={config.config}
                    theme={theme.theme}
                    onThemeChange={theme.setTheme}
                    onClearCache={handleClearCache}
                    onDisconnect={handleDisconnect}
                    showNotification={notifications.showNotification}
                />

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
 * App with internationalization, authentication, subscription and density support
 * Wraps the main App component with LocaleProvider, AuthProvider, SubscriptionProvider and DensityProvider
 */
function AppWithProviders() {
    // Si Supabase n'est pas configuré, afficher un warning mais continuer
    if (!supabaseClient) {
        console.warn('[App] Supabase client not configured. Auth and subscription features will be disabled.');
    }

    return (
        <LocaleProvider>
            <DensityProvider platform="app" defaultDensity="comfortable">
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
            </DensityProvider>
        </LocaleProvider>
    );
}

export default AppWithProviders;