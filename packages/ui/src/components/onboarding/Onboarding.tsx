// packages/ui/src/components/onboarding/Onboarding.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton, MotionMain } from '../common/MotionWrapper';
import { authDataManager } from '../../services/AuthDataManager';
import {
    ChevronRight,
    Check,
    Shield,
    Sparkles,
    Zap,
    ArrowRight,
    Loader,
    Database
} from 'lucide-react';
import { NotionClipperLogo } from '../../assets/icons';
import { useTranslation } from '@notion-clipper/i18n';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthScreen } from '../auth/AuthScreen';
import { NotionConnectScreen } from '../auth/NotionConnectScreen';
import { PremiumStep } from './PremiumStep';

export interface OnboardingProps {
    mode?: 'default' | 'compact';
    // Backward compatible: support both old and new callback signatures
    onComplete: ((token: string, workspace?: { id: string; name: string; icon?: string }) => void | Promise<void>) |
                ((data: {
                    userId: string;
                    email: string;
                    notionToken: string;
                    workspace: { id: string; name: string; icon?: string }
                }) => void | Promise<void>);
    onValidateToken?: (token: string) => Promise<boolean>;
    initialToken?: string;
    platform?: 'windows' | 'macos' | 'linux' | 'web';
    variant?: 'app' | 'extension';
    supabaseClient?: SupabaseClient; // Optional for backward compatibility
    useNewAuthFlow?: boolean; // Feature flag pour basculer entre ancien et nouveau flow
    // 🆕 Handlers pour l'étape premium
    onStartTrial?: () => Promise<void>;
    onUpgradeNow?: (plan: 'monthly' | 'annual') => Promise<void>;
    onStayFree?: () => void;
}

export function Onboarding({
    mode = 'default',
    onComplete,
    onValidateToken,
    initialToken = '',
    platform = 'windows',
    variant = 'app',
    supabaseClient,
    useNewAuthFlow = false,
    onStartTrial,
    onUpgradeNow,
    onStayFree
}: OnboardingProps) {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [notionToken, setNotionToken] = useState(initialToken);
    const [showNotionKey, setShowNotionKey] = useState(false);
    const [validating, setValidating] = useState(false);
    const [tokenError, setTokenError] = useState('');
    const [clipboardPermission, setClipboardPermission] = useState(false);

    // 🆕 États pour OAuth simplifié
    const [oauthLoading, setOauthLoading] = useState(false);

    // 🆕 États pour le nouveau flow d'authentification
    const [authUserId, setAuthUserId] = useState<string>('');
    const [authEmail, setAuthEmail] = useState<string>('');
    const [workspace, setWorkspace] = useState<{ id: string; name: string; icon?: string }>();
    const [isNewUser, setIsNewUser] = useState(false); // Tracker si c'est une inscription

    // 🔧 FIX BUG #2 (VRAIE CORRECTION) - Exclure l'étape Notion si déjà connecté via OAuth
    const steps = useMemo(() => {
        const hasNotionConnection = !!(notionToken && workspace);

        console.log('[Onboarding] Recalculating steps:', {
            isNewUser,
            hasNotionConnection,
            notionToken: !!notionToken,
            workspace: !!workspace
        });

        if (useNewAuthFlow) {
            if (variant === 'extension') {
                return [
                    { id: 'welcome', title: t('onboarding.welcome') },
                    { id: 'auth', title: 'Authentification' },
                    // ⚡ N'inclure l'étape Notion QUE si pas déjà connecté
                    ...(hasNotionConnection ? [] : [{ id: 'notion', title: 'Notion' }]),
                    { id: 'permissions', title: t('onboarding.permissions') }
                ];
            } else {
                // App variant
                return [
                    { id: 'welcome', title: t('onboarding.welcome') },
                    { id: 'auth', title: 'Authentification' },
                    // ⚡ N'inclure l'étape Notion QUE si pas déjà connecté
                    ...(hasNotionConnection ? [] : [{ id: 'notion', title: 'Notion' }]),
                    // Inclure upgrade seulement si nouveau user
                    ...(isNewUser ? [{ id: 'upgrade', title: 'Premium' }] : [])
                ];
            }
        } else {
            // Ancien flow
            if (variant === 'extension') {
                return [
                    { id: 'welcome', title: t('onboarding.welcome') },
                    { id: 'connect', title: t('onboarding.connection') },
                    { id: 'permissions', title: t('onboarding.permissions') }
                ];
            } else {
                return [
                    { id: 'welcome', title: t('onboarding.welcome') },
                    { id: 'connect', title: t('onboarding.notionConnection') }
                ];
            }
        }
    }, [useNewAuthFlow, variant, isNewUser, notionToken, workspace, t]);

    // Helper function pour passer à l'étape suivante en toute sécurité
    const goToNextStep = () => {
        const nextStep = currentStep + 1;
        if (nextStep < steps.length) {
            setCurrentStep(nextStep);
        } else {
            console.warn('[Onboarding] Attempted to go beyond last step');
        }
    };

    // 🔧 FIX BUG #2 (PARTIE 2) - Ajuster currentStep si steps change et qu'on dépasse
    useEffect(() => {
        if (currentStep >= steps.length && steps.length > 0) {
            const newStep = steps.length - 1;
            console.warn('[Onboarding] currentStep out of bounds, adjusting from', currentStep, 'to', newStep);
            setCurrentStep(newStep);
        }
    }, [steps.length, currentStep]);

    // 🔧 FIX BUG #3 - Charger la progression sauvegardée au montage
    useEffect(() => {
        const loadProgress = async () => {
            if (!authUserId) return;

            try {
                const progress = await authDataManager.loadOnboardingProgress(authUserId);
                if (progress) {
                    console.log('[Onboarding] ✅ Loaded saved progress:', progress);

                    // Restaurer l'état
                    setCurrentStep(progress.currentStep || 0);
                    if (progress.authCompleted) {
                        setAuthUserId(authUserId);
                    }
                    if (progress.notionCompleted && progress.notionToken && progress.notionWorkspace) {
                        setNotionToken(progress.notionToken);
                        setWorkspace(progress.notionWorkspace);
                    }
                }
            } catch (error) {
                console.error('[Onboarding] Error loading progress:', error);
            }
        };

        loadProgress();
    }, [authUserId]);

    // 🔧 FIX BUG #3 - Sauvegarder la progression à chaque changement d'étape
    useEffect(() => {
        const saveProgress = async () => {
            if (!authUserId) return;

            try {
                await authDataManager.saveOnboardingProgress(authUserId, {
                    currentStep,
                    authCompleted: !!authUserId,
                    notionCompleted: !!(notionToken && workspace)
                });

                console.log('[Onboarding] ✅ Progress saved:', currentStep);
            } catch (error) {
                console.error('[Onboarding] Error saving progress:', error);
            }
        };

        saveProgress();
    }, [currentStep, authUserId, notionToken, workspace]);

    const handleTokenValidation = async () => {
        if (!notionToken.trim()) {
            setTokenError(t('onboarding.tokenRequired'));
            return false;
        }

        setValidating(true);
        setTokenError('');

        try {
            if (onValidateToken) {
                const isValid = await onValidateToken(notionToken);
                if (!isValid) {
                    setTokenError(t('onboarding.invalidToken'));
                    return false;
                }
            }
            return true;
        } catch (error) {
            setTokenError(t('onboarding.connectionError'));
            return false;
        } finally {
            setValidating(false);
        }
    };

    // 🆕 Fonction OAuth avec design premium
    const handleOAuthFlow = async () => {
        console.log('[Frontend] Starting OAuth flow...');
        setOauthLoading(true);
        setTokenError('');

        try {
            console.log('[Frontend] Checking electronAPI availability:', !!(window as any).electronAPI?.invoke);
            if ((window as any).electronAPI?.invoke) {
                console.log('[Frontend] Calling notion:startOAuth...');
                const result = await (window as any).electronAPI.invoke('notion:startOAuth');
                console.log('[Frontend] OAuth result:', result);
                console.log('[Frontend] OAuth result type:', typeof result);
                console.log('[Frontend] OAuth result keys:', result ? Object.keys(result) : 'null');
                console.log('[Frontend] OAuth result.success:', result?.success);
                console.log('[Frontend] OAuth result.authUrl:', result?.authUrl);

                if (!result) {
                    throw new Error('OAuth initialization failed: no result returned');
                }

                if (result.success && result.authUrl) {
                    await (window as any).electronAPI.invoke('open-external', result.authUrl);

                    console.log('[Frontend] Waiting for oauth:result event...');
                    const authResult = await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            console.log('[Frontend] OAuth timeout after 5 minutes');
                            reject(new Error(t('onboarding.oauthTimeout')));
                        }, 300000); // 5 minutes

                        const handleOAuthResult = (data: any) => {
                            console.log('[Frontend] Received oauth:result event:', data);
                            clearTimeout(timeout);
                            (window as any).electronAPI.removeListener('oauth:result', handleOAuthResult);
                            resolve(data);
                        };

                        (window as any).electronAPI.on('oauth:result', handleOAuthResult);
                        console.log('[Frontend] Listener registered for oauth:result');
                    });
                    console.log('[Frontend] authResult received:', authResult);

                    console.log('[Frontend] Checking authResult.success:', (authResult as any).success);
                    console.log('[Frontend] Checking authResult.token:', (authResult as any).token ? 'YES' : 'NO');
                    console.log('[Frontend] Checking authResult.workspace:', (authResult as any).workspace);

                    if ((authResult as any).success && (authResult as any).token) {
                        console.log('[Frontend] ✅ OAuth successful, setting token and calling onComplete');
                        setNotionToken((authResult as any).token);

                        // Sauvegarder le workspace
                        if ((authResult as any).workspace) {
                            setWorkspace((authResult as any).workspace);
                        }

                        setOauthLoading(false);
                        setTokenError('✨ ' + t('onboarding.connectionSuccess'));

                        if (useNewAuthFlow) {
                            // Nouveau flow: juste passer à l'étape suivante
                            setTimeout(() => {
                                goToNextStep();
                            }, 1500);
                        } else {
                            // Ancien flow: appeler onComplete directement
                            setTimeout(() => {
                                console.log('[Frontend] Calling onComplete with token and workspace:', (authResult as any).workspace);
                                (onComplete as (token: string, workspace?: any) => void)((authResult as any).token, (authResult as any).workspace);
                            }, 2500);
                        }
                    } else {
                        console.log('[Frontend] ❌ OAuth failed:', (authResult as any).error);
                        setTokenError((authResult as any).error || t('onboarding.authError'));
                        setOauthLoading(false);
                    }
                } else {
                    setTokenError(result.error || t('onboarding.oauthStartError'));
                    setOauthLoading(false);
                }
            } else {
                setTokenError(t('onboarding.apiNotAvailable'));
                setOauthLoading(false);
            }
        } catch (error) {
            setTokenError(error instanceof Error ? error.message : t('onboarding.authError'));
            setOauthLoading(false);
        }
    };

    // 🆕 Handler pour l'authentification (nouveau flow)
    const handleAuthSuccess = (userId: string, email: string, notionData?: {
        token: string;
        workspace: { id: string; name: string; icon?: string };
    }, isSignup: boolean = false) => {
        console.log('[Onboarding] Auth success:', userId, email, notionData ? 'with Notion data' : 'without Notion data', 'isSignup:', isSignup);

        // 🔧 FIX BUG #2 (VRAIE CORRECTION) - Mettre à jour tous les états AVANT la navigation
        setAuthUserId(userId);
        setAuthEmail(email);
        setTokenError('');
        setIsNewUser(isSignup);

        // Si l'utilisateur s'est connecté via Notion OAuth, stocker les données Notion
        if (notionData) {
            console.log('[Onboarding] Notion already connected via OAuth, storing data...');
            setNotionToken(notionData.token);
            setWorkspace(notionData.workspace);

            // ⚡ Le tableau `steps` sera automatiquement recalculé sans l'étape 'notion'
            // Grâce au useMemo qui dépend de notionToken et workspace
            console.log('[Onboarding] ✅ Steps will exclude Notion step automatically');
        }

        // Passer à l'étape suivante automatiquement
        // React recalculera `steps` au prochain render avec les nouvelles valeurs
        setTimeout(() => {
            goToNextStep();
        }, 500);
    };

    // 🆕 Handler pour la connexion Notion (nouveau flow)
    const handleNotionConnect = async () => {
        console.log('[Onboarding] Starting Notion OAuth...');
        await handleOAuthFlow();
    };

    const handleNext = async () => {
        if (currentStep === steps.length - 1) {
            if (variant === 'extension' && !clipboardPermission) {
                setTokenError(t('onboarding.clipboardPermissionRequired'));
                return;
            }

            if (useNewAuthFlow) {
                // Nouveau flow: vérifier que auth + notion sont complétés
                if (!authUserId || !notionToken || !workspace) {
                    setTokenError('Authentification ou connexion Notion incomplète');
                    return;
                }
                // Appeler onComplete avec les nouvelles données
                (onComplete as (data: any) => void)({
                    userId: authUserId,
                    email: authEmail,
                    notionToken,
                    workspace
                });
            } else {
                // Ancien flow
                if (!notionToken) {
                    setTokenError(t('onboarding.notionConnectionIncomplete'));
                    return;
                }
                (onComplete as (token: string, workspace?: any) => void)(notionToken, workspace);
            }
        } else if (steps[currentStep].id === 'connect') {
            await handleOAuthFlow();
        } else if (steps[currentStep].id === 'auth') {
            // L'auth se fait via le composant AuthScreen, on passe juste à l'étape suivante
            // si l'utilisateur est déjà authentifié
            if (authUserId) {
                goToNextStep();
            }
        } else if (steps[currentStep].id === 'notion') {
            // La connexion Notion se fait via le bouton dans NotionConnectScreen
            // Vérifier qu'elle est complétée
            if (notionToken && workspace) {
                goToNextStep();
            }
        } else if (steps[currentStep].id === 'upgrade') {
            // Skip l'étape upgrade (l'utilisateur a cliqué "continuer")
            goToNextStep();
        } else {
            goToNextStep();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            setTokenError('');
        }
    };

    const renderStepContent = () => {
        const step = steps[currentStep];

        // Safety check: prevent crash if step is undefined
        if (!step) {
            console.error('[Onboarding] Step not found for currentStep:', currentStep, 'Available steps:', steps.length);
            return null;
        }

        switch (step.id) {
            case 'welcome':
                return (
                    <MotionDiv
                        className="text-center space-y-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <MotionDiv
                            className="flex justify-center"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <div className="relative">
                                <NotionClipperLogo size={96} />
                            </div>
                        </MotionDiv>

                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {t('onboarding.welcomeTitle')}
                            </h2>
                            <p className="text-gray-600 max-w-md mx-auto">
                                {variant === 'extension'
                                    ? t('onboarding.welcomeSubtitle')
                                    : t('onboarding.welcomeDescription')
                                }
                            </p>
                        </div>

                        {/* Features cards */}
                        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                            <MotionDiv
                                className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl"
                                whileHover={{ scale: 1.05 }}
                            >
                                <Zap className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-700 font-medium">{t('onboarding.featureQuickCapture')}</p>
                            </MotionDiv>
                            <MotionDiv
                                className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl"
                                whileHover={{ scale: 1.05 }}
                            >
                                <Database className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-700 font-medium">{t('onboarding.featureOrganization')}</p>
                            </MotionDiv>
                            <MotionDiv
                                className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl"
                                whileHover={{ scale: 1.05 }}
                            >
                                <Check className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-700 font-medium">{t('onboarding.featureSync')}</p>
                            </MotionDiv>
                        </div>
                    </MotionDiv>
                );

            case 'connect':
                return (
                    <MotionDiv
                        className="w-full max-w-[420px]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <MotionDiv
                            className="flex flex-col items-center mb-8"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="mb-6 relative">
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                                    alt="Notion"
                                    className="w-16 h-16 object-contain drop-shadow-sm"
                                />
                            </div>

                            <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight mb-2">
                                {t('onboarding.connectToNotion')}
                            </h1>

                            <p className="text-[14px] text-gray-600 text-center leading-relaxed max-w-[340px]">
                                {t('onboarding.authorizeAccess')}
                            </p>
                        </MotionDiv>

                        <MotionDiv
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="space-y-4"
                        >
                            <button
                                onClick={handleOAuthFlow}
                                disabled={oauthLoading}
                                className="group relative w-full overflow-hidden rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 group-hover:scale-105 transition-transform duration-300" />

                                <div className="relative flex items-center justify-center gap-3 px-6 py-4">
                                    {oauthLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span className="text-white font-medium text-[15px]">
                                                {t('common.loading')}...
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <img
                                                src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                                                alt=""
                                                className="w-5 h-5 object-contain"
                                            />
                                            <span className="text-white font-medium text-[15px]">
                                                {t('onboarding.continueWithNotion')}
                                            </span>
                                            <ArrowRight
                                                className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform"
                                                strokeWidth={2.5}
                                            />
                                        </>
                                    )}
                                </div>
                            </button>
                        </MotionDiv>

                        <MotionDiv
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="mt-6"
                        >
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <div className="flex-shrink-0">
                                    <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                        <Shield className="w-3.5 h-3.5 text-gray-600" strokeWidth={2} />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[12px] text-gray-600 leading-relaxed">
                                        {t('onboarding.securityNote')}
                                    </p>
                                </div>
                            </div>
                        </MotionDiv>

                        {tokenError && (
                            <MotionDiv
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="mt-4"
                            >
                                {tokenError.includes('✨') ? (
                                    <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[13px] font-semibold text-emerald-900 mb-1">
                                                {t('onboarding.connectionSuccess')}
                                            </h4>
                                            <p className="text-[13px] text-emerald-700 leading-relaxed">
                                                {tokenError.replace('✨ ', '')}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[13px] font-semibold text-red-900 mb-1">
                                                {t('errors.errorOccurred')}
                                            </h4>
                                            <p className="text-[13px] text-red-700 leading-relaxed">
                                                {tokenError}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </MotionDiv>
                        )}
                    </MotionDiv>
                );

            case 'auth':
                // Nouveau flow: étape d'authentification
                if (!supabaseClient) {
                    return (
                        <div className="text-center text-red-600">
                            Erreur: Supabase client non disponible
                        </div>
                    );
                }
                return (
                    <AuthScreen
                        supabaseClient={supabaseClient}
                        onAuthSuccess={handleAuthSuccess}
                        onError={(error) => setTokenError(error)}
                    />
                );

            case 'notion':
                // Nouveau flow: étape de connexion Notion
                return (
                    <NotionConnectScreen
                        onConnect={handleNotionConnect}
                        userEmail={authEmail}
                        loading={oauthLoading}
                    />
                );

            case 'upgrade':
                // 🔧 FIX BUG #7 - Nouvelle UI Premium professionnelle
                return (
                    <PremiumStep
                        onStartTrial={onStartTrial || (async () => {
                            console.warn('[Onboarding] onStartTrial not provided');
                            setTokenError('Essai gratuit bientôt disponible');
                        })}
                        onUpgradeNow={onUpgradeNow || (async () => {
                            console.warn('[Onboarding] onUpgradeNow not provided');
                            setTokenError('Upgrade bientôt disponible');
                        })}
                        onStayFree={onStayFree || (() => {
                            console.log('[Onboarding] User chose to stay free, completing onboarding...');
                            // Si upgrade est la dernière étape, compléter l'onboarding
                            if (currentStep === steps.length - 1) {
                                // Appeler onComplete avec les données nécessaires
                                if (useNewAuthFlow && authUserId && notionToken && workspace) {
                                    (onComplete as (data: any) => void)({
                                        userId: authUserId,
                                        email: authEmail,
                                        notionToken,
                                        workspace
                                    });
                                } else {
                                    console.warn('[Onboarding] Missing data to complete onboarding');
                                    setTokenError('Données manquantes pour terminer l\'onboarding');
                                }
                            } else {
                                goToNextStep(); // S'il y a d'autres étapes après
                            }
                        })}
                        loading={oauthLoading}
                    />
                );

            case 'permissions':
                return (
                    <MotionDiv
                        className="space-y-6"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Check size={28} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {t('onboarding.lastStep')}
                            </h3>
                            <p className="text-gray-600">
                                {t('onboarding.allowClipboard')}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${clipboardPermission
                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                        : 'bg-gray-200'
                                        }`}>
                                        <Check size={20} className={clipboardPermission ? 'text-white' : 'text-gray-400'} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 mb-2">
                                            {t('onboarding.clipboardAccess')}
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-4">
                                            {t('onboarding.clipboardRequired')}
                                        </p>
                                        {!clipboardPermission && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome?.permissions) {
                                                            const granted = await (window as any).chrome.permissions.request({
                                                                permissions: ['clipboardRead']
                                                            });
                                                            setClipboardPermission(granted);
                                                        } else if (navigator?.permissions) {
                                                            const result = await navigator.permissions.query({
                                                                name: 'clipboard-read' as PermissionName
                                                            });
                                                            setClipboardPermission(result.state === 'granted');
                                                        } else {
                                                            setClipboardPermission(true);
                                                        }
                                                    } catch (err) {
                                                        console.error('Permission error:', err);
                                                        setClipboardPermission(true);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                {t('onboarding.allowAccess')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-600 leading-relaxed">
                                {t('onboarding.privacyNote')}
                            </p>
                        </div>
                    </MotionDiv>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 z-50 p-4 [color-scheme:light] dark:bg-gradient-to-br dark:from-blue-50 dark:via-purple-50 dark:to-pink-50">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-50">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob" style={{ animationDelay: '2s' }}></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob" style={{ animationDelay: '4s' }}></div>
                    <div className="absolute bottom-0 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob" style={{ animationDelay: '6s' }}></div>
                </div>
            </div>

            <MotionDiv
                className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden ${mode === 'compact' ? 'max-w-md w-full' : 'max-w-2xl w-full'
                    } dark:bg-white`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="h-1 bg-gray-100 dark:bg-gray-100">
                    <MotionDiv
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-100">
                    <div className="flex items-center justify-center gap-3">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <MotionDiv
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${index === currentStep
                                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                                        : index < currentStep
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-100 dark:text-emerald-700'
                                            : 'bg-gray-100 text-gray-400 dark:bg-gray-100 dark:text-gray-400'
                                        }`}
                                    animate={index === currentStep ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ duration: 0.5 }}
                                >
                                    {index < currentStep ? (
                                        <Check size={14} />
                                    ) : (
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center ${index === currentStep ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-300'
                                            }`}>
                                            {index + 1}
                                        </span>
                                    )}
                                    <span>{step.title}</span>
                                </MotionDiv>
                                {index < steps.length - 1 && (
                                    <ChevronRight size={16} className="mx-2 text-gray-300 dark:text-gray-300" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-8 py-8 min-h-[400px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {renderStepContent()}
                    </AnimatePresence>
                </div>

                <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 dark:border-gray-100 dark:bg-gray-50/50">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handlePrevious}
                            disabled={currentStep === 0}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${currentStep === 0
                                ? 'text-gray-300 cursor-not-allowed dark:text-gray-300'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-600 dark:hover:bg-gray-100'
                                }`}
                        >
                            {t('common.back')}
                        </button>

                        {(currentStep < steps.length - 1 && !['connect', 'auth', 'notion', 'upgrade'].includes(steps[currentStep].id)) && (
                            <button
                                onClick={handleNext}
                                disabled={validating || oauthLoading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <>
                                    {t('common.continue')}
                                    <ChevronRight size={16} />
                                </>
                            </button>
                        )}
                    </div>
                </div>
            </MotionDiv>
        </div>
    );
}
