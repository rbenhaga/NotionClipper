// packages/ui/src/components/onboarding/Onboarding.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper'; // Assurez-vous que MotionDiv supporte les props HTML
import { authDataManager } from '../../services/AuthDataManager';
import {
    ChevronRight,
    Check,
    Shield,
    Zap,
    ArrowRight,
    Database,
    Sparkles,
    Lock
} from 'lucide-react';
import { ClipperProLogo } from '../../assets/icons';
import { useTranslation } from '@notion-clipper/i18n';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthScreen } from '../auth/AuthScreen';
import { WebAuthScreen } from '../auth/WebAuthScreen';
import { NotionConnectScreen } from '../auth/NotionConnectScreen';
import { PremiumStep } from './PremiumStep';

export interface OnboardingProps {
    mode?: 'default' | 'compact';
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
    supabaseClient?: SupabaseClient;
    supabaseUrl?: string;
    supabaseKey?: string;
    useNewAuthFlow?: boolean;
    useWebAuth?: boolean;
    onStartTrial?: () => Promise<void>;
    onUpgradeNow?: (plan: 'monthly' | 'yearly') => Promise<void>;
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
    supabaseUrl = '',
    supabaseKey = '',
    useNewAuthFlow = false,
    useWebAuth = false,
    onStartTrial,
    onUpgradeNow,
    onStayFree
}: OnboardingProps) {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [notionToken, setNotionToken] = useState(initialToken);
    const [tokenError, setTokenError] = useState('');
    const [validating, setValidating] = useState(false);
    const [clipboardPermission, setClipboardPermission] = useState(false);

    // États Auth
    const [oauthLoading, setOauthLoading] = useState(false);
    const [authUserId, setAuthUserId] = useState<string>('');
    const [authEmail, setAuthEmail] = useState<string>('');
    const [workspace, setWorkspace] = useState<{ id: string; name: string; icon?: string }>();
    const [isNewUser, setIsNewUser] = useState(false);

    // --- Calcul des étapes ---
    const steps = useMemo(() => {
        const hasNotionConnection = !!(notionToken && workspace);

        if (useNewAuthFlow) {
            if (variant === 'extension') {
                return [
                    { id: 'welcome', title: t('onboarding.welcome') },
                    { id: 'auth', title: 'Compte' },
                    ...((hasNotionConnection || useWebAuth) ? [] : [{ id: 'notion', title: 'Notion' }]),
                    { id: 'permissions', title: 'Accès' }
                ];
            } else {
                // App variant
                return [
                    { id: 'welcome', title: t('onboarding.welcome') },
                    { id: 'auth', title: 'Compte' },
                    ...(isNewUser ? [{ id: 'upgrade', title: 'Premium' }] : [])
                ];
            }
        } else {
            // Legacy flow
            if (variant === 'extension') {
                return [
                    { id: 'welcome', title: t('onboarding.welcome') },
                    { id: 'connect', title: 'Connexion' },
                    { id: 'permissions', title: 'Accès' }
                ];
            } else {
                return [
                    { id: 'welcome', title: t('onboarding.welcome') },
                    { id: 'connect', title: 'Connexion' }
                ];
            }
        }
    }, [useNewAuthFlow, variant, isNewUser, notionToken, workspace, useWebAuth, t]);

    // --- Helpers de navigation ---
    const goToNextStep = () => {
        const nextStep = currentStep + 1;
        if (nextStep < steps.length) setCurrentStep(nextStep);
    };

    // Ajustement index si steps change
    useEffect(() => {
        if (currentStep >= steps.length && steps.length > 0) {
            setCurrentStep(steps.length - 1);
        }
    }, [steps.length, currentStep]);

    // Chargement progression
    useEffect(() => {
        const loadProgress = async () => {
            if (!authUserId) return;
            try {
                const progress = await authDataManager.loadOnboardingProgress(authUserId);
                if (progress) {
                    if (progress.notionCompleted && progress.notionToken && progress.notionWorkspace) {
                        setNotionToken(progress.notionToken);
                        setWorkspace(progress.notionWorkspace);
                    }
                    if (progress.authCompleted) setAuthUserId(authUserId);
                    setCurrentStep(progress.currentStep || 0);
                }
            } catch (error) {
                console.error(error);
            }
        };
        loadProgress();
    }, [authUserId]);

    // Sauvegarde progression
    useEffect(() => {
        const saveProgress = async () => {
            if (!authUserId) return;
            try {
                await authDataManager.saveOnboardingProgress(authUserId, {
                    currentStep,
                    authCompleted: !!authUserId,
                    notionCompleted: !!(notionToken && workspace)
                });
            } catch (error) {
                console.error(error);
            }
        };
        saveProgress();
    }, [currentStep, authUserId, notionToken, workspace]);

    // --- Handlers ---
    const handleOAuthFlow = async () => {
        setOauthLoading(true);
        setTokenError('');
        try {
            if ((window as any).electronAPI?.invoke) {
                const result = await (window as any).electronAPI.invoke('notion:startOAuth');
                if (result.success && result.authUrl) {
                    await (window as any).electronAPI.invoke('open-external', result.authUrl);
                    
                    const authResult = await new Promise((resolve, reject) => {
                         const timeout = setTimeout(() => reject(new Error(t('onboarding.oauthTimeout'))), 300000);
                         const handleResult = (data: any) => {
                             clearTimeout(timeout);
                             (window as any).electronAPI.removeListener('oauth:result', handleResult);
                             resolve(data);
                         };
                         (window as any).electronAPI.on('oauth:result', handleResult);
                    });

                    if ((authResult as any).success && (authResult as any).token) {
                        setNotionToken((authResult as any).token);
                        if ((authResult as any).workspace) setWorkspace((authResult as any).workspace);
                        
                        setOauthLoading(false);
                        setTokenError('✨ ' + t('onboarding.connectionSuccess'));

                        if (useNewAuthFlow) {
                            setTimeout(() => goToNextStep(), 1500);
                        } else {
                            setTimeout(() => {
                                (onComplete as any)((authResult as any).token, (authResult as any).workspace);
                            }, 2500);
                        }
                    } else {
                        throw new Error((authResult as any).error || t('onboarding.authError'));
                    }
                } else {
                    throw new Error(result.error || t('onboarding.oauthStartError'));
                }
            } else {
                throw new Error(t('onboarding.apiNotAvailable'));
            }
        } catch (error) {
            setTokenError(error instanceof Error ? error.message : t('onboarding.authError'));
            setOauthLoading(false);
        }
    };

    const handleAuthSuccess = (userId: string, email: string, notionData?: any, isSignup: boolean = false) => {
        setAuthUserId(userId);
        setAuthEmail(email);
        setTokenError('');
        setIsNewUser(isSignup);

        if (notionData) {
            setNotionToken(notionData.token);
            setWorkspace(notionData.workspace);
            
            if (!isSignup) {
                // Returning user -> Complete immediately
                authDataManager.clearOnboardingProgress().catch(console.error);
                setTimeout(() => {
                     if (useNewAuthFlow) {
                        (onComplete as any)({ userId, email, notionToken: notionData.token, workspace: notionData.workspace });
                    } else {
                        (onComplete as any)(notionData.token, notionData.workspace);
                    }
                }, 300);
                return;
            }
            // Signup with Notion -> Skip Notion step
            authDataManager.clearOnboardingProgress().catch(console.error);
            setTimeout(() => goToNextStep(), 500);
        } else {
            // Signup without Notion or Returning without Notion
            setTimeout(() => goToNextStep(), 500);
        }
    };

    const handleNotionConnect = async () => {
        await handleOAuthFlow();
    };

    const handleNext = async () => {
        // Validation logique avant navigation
        if (currentStep === steps.length - 1) {
            if (variant === 'extension' && !clipboardPermission) {
                setTokenError(t('onboarding.clipboardPermissionRequired'));
                return;
            }
            if (useNewAuthFlow) {
                if (!authUserId || !notionToken || !workspace) {
                    setTokenError('Configuration incomplète');
                    return;
                }
                (onComplete as any)({ userId: authUserId, email: authEmail, notionToken, workspace });
            } else {
                if (!notionToken) {
                    setTokenError(t('onboarding.notionConnectionIncomplete'));
                    return;
                }
                (onComplete as any)(notionToken, workspace);
            }
        } else {
            // Logique specifique par step si nécessaire (déjà géré par les composants enfants généralement)
             if (steps[currentStep].id === 'connect') {
                await handleOAuthFlow();
            } else if (steps[currentStep].id === 'notion' && notionToken && workspace) {
                 goToNextStep();
            } else {
                goToNextStep();
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            setTokenError('');
        }
    };

    // --- Rendu du contenu ---
    const renderStepContent = () => {
        const step = steps[currentStep];
        if (!step) return null;

        switch (step.id) {
            case 'welcome':
                return (
                    <MotionDiv
                        className="text-center space-y-8"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        <MotionDiv
                            className="flex justify-center mb-6"
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <div className="relative p-2">
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl" />
                                <ClipperProLogo size={80} />
                            </div>
                        </MotionDiv>

                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                                {t('onboarding.welcomeTitle')}
                            </h2>
                            <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
                                {variant === 'extension'
                                    ? t('onboarding.welcomeSubtitle')
                                    : t('onboarding.welcomeDescription')
                                }
                            </p>
                        </div>

                        {/* Cards modernes */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                            {[
                                { icon: Zap, label: t('onboarding.featureQuickCapture'), color: 'text-amber-600', bg: 'bg-gradient-to-br from-amber-50 to-orange-50', border: 'border-amber-100' },
                                { icon: Database, label: t('onboarding.featureOrganization'), color: 'text-indigo-600', bg: 'bg-gradient-to-br from-indigo-50 to-blue-50', border: 'border-indigo-100' },
                                { icon: Sparkles, label: t('onboarding.featureSync'), color: 'text-purple-600', bg: 'bg-gradient-to-br from-purple-50 to-pink-50', border: 'border-purple-100' }
                            ].map((feature, idx) => (
                                <MotionDiv
                                    key={idx}
                                    className={`p-6 bg-white ${feature.border} border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300`}
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                                        <feature.icon className={`w-6 h-6 ${feature.color}`} />
                                    </div>
                                    <p className="text-sm text-gray-700 font-medium text-center leading-relaxed">{feature.label}</p>
                                </MotionDiv>
                            ))}
                        </div>
                    </MotionDiv>
                );

            case 'connect':
            case 'notion':
                if (step.id === 'notion' && useNewAuthFlow) {
                    return (
                        <NotionConnectScreen
                            onConnect={handleNotionConnect}
                            userEmail={authEmail}
                            loading={oauthLoading}
                        />
                    );
                }
                // Legacy Connect UI - Design moderne
                return (
                    <MotionDiv
                        className="w-full max-w-[480px] mx-auto text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                         <div className="mb-8 relative inline-block">
                             <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full blur-xl opacity-60" />
                             <div className="relative w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                                    alt="Notion"
                                    className="w-12 h-12 object-contain"
                                />
                             </div>
                        </div>

                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            {t('onboarding.connectToNotion')}
                        </h1>
                        <p className="text-gray-600 mb-10 text-lg leading-relaxed max-w-md mx-auto">
                            {t('onboarding.authorizeAccess')}
                        </p>

                        <button
                            onClick={handleOAuthFlow}
                            disabled={oauthLoading}
                            className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
                        >
                            <div className="relative flex items-center justify-center gap-3 px-8 py-4">
                                {oauthLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" className="w-5 h-5" alt="" />
                                        <span className="font-semibold text-base">{t('onboarding.continueWithNotion')}</span>
                                        <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                        
                        {tokenError && (
                            <MotionDiv 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 flex items-center gap-2 justify-center"
                            >
                                <span className="font-medium">Erreur:</span> {tokenError.replace('✨ ', '')}
                            </MotionDiv>
                        )}
                    </MotionDiv>
                );

            case 'auth':
                if (useWebAuth) {
                    return (
                         <WebAuthScreen
                            onAuthSuccess={(userId, email, token, notionData) => {
                                handleAuthSuccess(userId, email, notionData, !notionData);
                            }}
                            onError={(error) => setTokenError(error)}
                        />
                    );
                }
                if (!supabaseClient) return <div className="text-red-500">Erreur config Supabase</div>;
                return (
                    <AuthScreen
                        supabaseClient={supabaseClient}
                        supabaseUrl={supabaseUrl}
                        supabaseKey={supabaseKey}
                        onAuthSuccess={handleAuthSuccess}
                        onError={(error) => setTokenError(error)}
                    />
                );

            case 'upgrade':
                return (
                    <PremiumStep
                        onStartTrial={onStartTrial || (async () => {})}
                        onUpgradeNow={onUpgradeNow || (async () => {})}
                        onStayFree={onStayFree || (() => {
                             if (currentStep === steps.length - 1 && authUserId && notionToken && workspace) {
                                (onComplete as any)({ userId: authUserId, email: authEmail, notionToken, workspace });
                             } else {
                                goToNextStep();
                             }
                        })}
                        loading={oauthLoading}
                    />
                );

            case 'permissions':
                return (
                    <MotionDiv
                        className="max-w-md mx-auto space-y-8"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.lastStep')}</h3>
                            <p className="text-gray-500">{t('onboarding.allowClipboard')}</p>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${clipboardPermission ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Check size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 mb-1">{t('onboarding.clipboardAccess')}</h4>
                                    <p className="text-sm text-gray-500 mb-3 leading-tight">{t('onboarding.clipboardRequired')}</p>
                                    
                                    {!clipboardPermission && (
                                        <button
                                            onClick={async () => {
                                                // Logique de permission (inchangée)
                                                try {
                                                    setClipboardPermission(true); // Simulation ou appel API réel
                                                } catch(e) { console.error(e) }
                                            }}
                                            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                                        >
                                            {t('onboarding.allowAccess')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </MotionDiv>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center font-sans overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900">
            {/* Fond moderne avec gradient subtil */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/20 pointer-events-none" />
            
            {/* Effets de lumière subtils et modernes */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-indigo-100/40 to-purple-100/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-100/30 to-pink-100/20 rounded-full blur-3xl pointer-events-none" />

            <MotionDiv
                className={`relative z-10 bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl overflow-hidden flex flex-col ${mode === 'compact' ? 'w-full max-w-md h-[600px]' : 'w-full max-w-2xl min-h-[550px]'}`}
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
                {/* Header avec Barre de progression moderne */}
                <div className="px-8 pt-8 pb-6">
                     <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                             {steps.map((step, index) => {
                                 const isActive = index === currentStep;
                                 const isCompleted = index < currentStep;
                                 return (
                                     <div key={step.id} className="flex items-center">
                                         <MotionDiv
                                             className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                                 isActive 
                                                 ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                                                 : isCompleted 
                                                    ? 'text-green-600 bg-green-50' 
                                                    : 'text-gray-400'
                                             }`}
                                             animate={isActive ? { scale: 1.02 } : { scale: 1 }}
                                         >
                                             <span className="relative z-10 flex items-center gap-2">
                                                 {isCompleted && <Check size={14} strokeWidth={2.5} />}
                                                 {step.title}
                                             </span>
                                         </MotionDiv>
                                         {index < steps.length - 1 && (
                                             <div className={`w-6 h-[2px] rounded-full mx-2 transition-colors ${
                                                 isCompleted ? 'bg-green-200' : 'bg-gray-200'
                                             }`} />
                                         )}
                                     </div>
                                 );
                             })}
                        </div>
                     </div>
                </div>

                {/* Contenu Principal */}
                <div className="flex-1 px-8 relative flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        <MotionDiv
                            key={currentStep}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                        >
                            {renderStepContent()}
                        </MotionDiv>
                    </AnimatePresence>
                </div>

                {/* Footer Navigation */}
                <div className="px-8 py-6 bg-white/80 border-t border-gray-100 flex items-center justify-between">
                    <button
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            currentStep === 0 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        {t('common.back')}
                    </button>

                    {(currentStep < steps.length - 1 && !['connect', 'auth', 'notion', 'upgrade'].includes(steps[currentStep].id)) && (
                        <button
                            onClick={handleNext}
                            disabled={validating || oauthLoading}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common.continue')}
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </MotionDiv>
        </div>
    );
}