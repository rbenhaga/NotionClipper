// apps/notion-clipper-app/src/react/src/App.tsx - VERSION OPTIMISÉE ET MODULAIRE
import React, { memo, useState, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

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
    WelcomePremiumModal,
    AuthProvider,
    useAuth,
    authDataManager,
    UserAuthData,
    subscriptionService
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
    } = useAppState();

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

    // 🆕 Subscription context pour afficher les quotas dans Header
    const subscriptionContext = useSubscriptionContext();
    const [subscriptionData, setSubscriptionData] = useState<any>(null);
    const [quotasData, setQuotasData] = useState<any>(null);

    // 🔧 FIX BUG #1 - Initialiser AuthDataManager et charger les données au startup
    useEffect(() => {
        const initAuth = async () => {
            try {
                console.log('[App] 🔐 Initializing AuthDataManager and SubscriptionService...');

                // Initialiser avec le client Supabase
                authDataManager.initialize(supabaseClient, supabaseUrl, supabaseAnonKey);
                subscriptionService.initialize(supabaseClient);

                // Charger les données auth sauvegardées
                const authData = await authDataManager.loadAuthData();

                if (authData) {
                    console.log('[App] ✅ Auth data loaded:', {
                        userId: authData.userId,
                        provider: authData.authProvider,
                        hasNotionToken: !!authData.notionToken,
                        onboardingCompleted: authData.onboardingCompleted
                    });

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
    useEffect(() => {
        if (!subscriptionContext || !onboardingCompleted) return;

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
    }, [subscriptionContext, onboardingCompleted]);

    // ============================================
    // HANDLERS SPÉCIFIQUES À L'APP
    // ============================================

    // Fonction vide - les fichiers sont gérés via attachedFiles dans handleSend
    const handleFileUpload = async (config: any) => {
        // Ne rien faire - les fichiers sont automatiquement envoyés via handleSend
        console.log('[App] File upload handled via attachedFiles, config:', config);
    };

    // 🆕 NOUVEAU HANDLER - Avec authentification complète (Option A)
    const handleNewOnboardingComplete = useCallback(async (data: {
        userId: string;
        email: string;
        notionToken: string;
        workspace: { id: string; name: string; icon?: string }
    }) => {
        console.log('[App] 🎯 New onboarding completed:', data);

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

        // 2. Sauvegarder le token localement (backward compatibility)
        const shouldShowModal = await handleCompleteOnboarding(data.notionToken, data.workspace);

        console.log('[App] 🎯 handleCompleteOnboarding returned:', shouldShowModal);

        // 3. Afficher le WelcomePremiumModal
        if (shouldShowModal === true) {
            console.log('[App] 🎉 Showing WelcomePremiumModal after onboarding');
            setTimeout(() => {
                setShowWelcomePremiumModal(true);
            }, 500); // Petit délai pour une transition fluide
        }
    }, [handleCompleteOnboarding, supabaseClient]);

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
    const handleUpgradeNow = async (plan: 'monthly' | 'annual') => {
        console.log('[App] 💳 Upgrading now to:', plan);

        try {
            // Récupérer l'userId depuis AuthDataManager
            const authData = authDataManager.getCurrentData();
            if (!authData?.userId) {
                throw new Error('User not authenticated');
            }

            console.log('[App] Creating checkout for user:', authData.userId, 'plan:', plan);

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
    };

    // 🎯 Vérification réelle des quotas avec SubscriptionService
    const checkQuota = async (): Promise<boolean> => {
        try {
            // Vérifier si l'utilisateur peut créer un clip
            const canCreate = await subscriptionService.canPerformAction('clip', 1);

            if (!canCreate) {
                // Quota atteint !
                console.log('[App] ❌ Quota reached for clips');
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
            await handleSend();

            // Note: Quota is tracked server-side in Supabase via IPC handler (secure, not crackable)
            // No need to increment locally - it's handled in backend

            // 🔧 FIX: Refresh quota data to update UI counter
            if (subscriptionContext) {
                try {
                    console.log('[App] 🔄 Refreshing quota data...');
                    const [sub, quotaSummary] = await Promise.all([
                        subscriptionContext.subscriptionService.getCurrentSubscription(),
                        subscriptionContext.quotaService.getQuotaSummary(),
                    ]);

                    setSubscriptionData(sub);
                    setQuotasData(quotaSummary);
                    console.log('[App] ✅ Quota refreshed:', quotaSummary?.clips);
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
        
        const handleFocusModeEnabled = async (_: any, data: any) => {
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
                                setIsOAuthCallback(false);
                                setShowOnboarding(false);
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
                        onMinimize={window.electronAPI?.minimizeWindow}
                        onMaximize={window.electronAPI?.maximizeWindow}
                        onClose={window.electronAPI?.closeWindow}
                        onOpenConfig={() => setShowConfig(true)}
                        pendingCount={pendingCount}
                        errorCount={errorCount}
                        onStatusClick={handleStatusClick}
                        selectedPage={selectedPage}
                        quotaSummary={quotasData}
                        subscriptionTier={subscriptionData?.tier || SubscriptionTier.FREE}
                        onUpgradeClick={() => setShowUpgradeModal(true)}
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
                    />

                    <NotificationManager
                        notifications={notifications.notifications}
                        onClose={notifications.closeNotification}
                    />

                    <AnimatePresence>
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
                    </AnimatePresence>

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
                    onMinimize={window.electronAPI?.minimizeWindow}
                    onMaximize={window.electronAPI?.maximizeWindow}
                    onClose={window.electronAPI?.closeWindow}
                    isConnected={networkStatus.isOnline}
                    pendingCount={pendingCount}
                    errorCount={errorCount}
                    onStatusClick={handleStatusClick}
                    selectedPage={selectedPage}
                    quotaSummary={quotasData}
                    subscriptionTier={subscriptionData?.tier || SubscriptionTier.FREE}
                    onUpgradeClick={() => setShowUpgradeModal(true)}
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

                                />
                            </UnifiedWorkspace>
                        </div>
                    )}
                </div>

                {/* Modales et panels */}
                <AnimatePresence>
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
                </AnimatePresence>

                <AnimatePresence>
                    {showFileUpload && (
                        <FileUploadModal
                            isOpen={showFileUpload}
                            onClose={() => setShowFileUpload(false)}
                            onAdd={(config) => {
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
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
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
                </AnimatePresence>

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
                <AnimatePresence>
                    {showFocusModeIntro && focusModeIntroPage && (
                        <FocusModeIntro
                            onComplete={handleFocusModeIntroComplete}
                            onSkip={handleFocusModeIntroSkip}
                        />
                    )}
                </AnimatePresence>

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

                {/* 🎯 Welcome Premium Modal (Onboarding Trial) */}
                <AnimatePresence>
                    {showWelcomePremiumModal && (
                        <WelcomePremiumModal
                            isOpen={showWelcomePremiumModal}
                            onClose={() => setShowWelcomePremiumModal(false)}
                            onStartTrial={handleStartTrial}
                            onStayFree={handleStayFree}
                        />
                    )}
                </AnimatePresence>
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
                    <SubscriptionProvider getSupabaseClient={() => supabaseClient}>
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