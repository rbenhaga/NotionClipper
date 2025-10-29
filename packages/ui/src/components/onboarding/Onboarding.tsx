// packages/ui/src/components/onboarding/Onboarding.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export interface OnboardingProps {
    mode?: 'default' | 'compact';
    onComplete: (token: string) => void;
    onValidateToken?: (token: string) => Promise<boolean>;
    initialToken?: string;
    platform?: 'windows' | 'macos' | 'linux' | 'web';
    variant?: 'app' | 'extension';
}

export function Onboarding({
    mode = 'default',
    onComplete,
    onValidateToken,
    initialToken = '',
    platform = 'windows',
    variant = 'app'
}: OnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [notionToken, setNotionToken] = useState(initialToken);
    const [showNotionKey, setShowNotionKey] = useState(false);
    const [validating, setValidating] = useState(false);
    const [tokenError, setTokenError] = useState('');
    const [clipboardPermission, setClipboardPermission] = useState(false);

    // 🆕 États pour OAuth simplifié
    const [oauthLoading, setOauthLoading] = useState(false);

    // ✨ ÉTAPES FUSIONNÉES : method + notion = connect
    const steps = variant === 'extension' ? [
        { id: 'welcome', title: 'Bienvenue' },
        { id: 'connect', title: 'Connexion' }, // Fusion des étapes 2 et 3
        { id: 'permissions', title: 'Permissions' }
    ] : [
        { id: 'welcome', title: 'Bienvenue' },
        { id: 'connect', title: 'Connexion Notion' } // Fusion des étapes 2 et 3
    ];

    const handleTokenValidation = async () => {
        if (!notionToken.trim()) {
            setTokenError('Le token est requis');
            return false;
        }

        setValidating(true);
        setTokenError('');

        try {
            if (onValidateToken) {
                const isValid = await onValidateToken(notionToken);
                if (!isValid) {
                    setTokenError('Token invalide. Vérifiez votre token d\'intégration.');
                    return false;
                }
            }
            return true;
        } catch (error) {
            setTokenError('Erreur de connexion. Veuillez réessayer.');
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
                // Démarrer le flow OAuth sans email (le serveur OAuth gère ça)
                const result = await (window as any).electronAPI.invoke('notion:startOAuth');
                console.log('[Frontend] OAuth result:', result);

                if (result.success && result.authUrl) {
                    // Ouvrir l'URL d'autorisation Notion
                    await (window as any).electronAPI.invoke('open-external', result.authUrl);

                    // Attendre le callback OAuth avec un timeout
                    const authResult = await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Timeout: Connexion OAuth expirée'));
                        }, 300000); // 5 minutes

                        // Écouter le résultat OAuth
                        const handleOAuthResult = (event: any, data: any) => {
                            clearTimeout(timeout);
                            (window as any).electronAPI.removeListener('oauth:result', handleOAuthResult);
                            resolve(data);
                        };

                        (window as any).electronAPI.on('oauth:result', handleOAuthResult);
                    });

                    if ((authResult as any).success && (authResult as any).token) {
                        setNotionToken((authResult as any).token);
                        setOauthLoading(false);
                        setTokenError('✨ Connexion réussie ! Redirection...');

                        // Attendre un peu pour montrer le succès, puis terminer
                        setTimeout(() => {
                            onComplete((authResult as any).token);
                        }, 2500); // Plus de temps pour voir l'animation
                    } else {
                        setTokenError((authResult as any).error || 'Erreur lors de l\'authentification');
                        setOauthLoading(false);
                    }
                } else {
                    setTokenError(result.error || 'Erreur lors du démarrage OAuth');
                    setOauthLoading(false);
                }
            } else {
                setTokenError('API Electron non disponible');
                setOauthLoading(false);
            }
        } catch (error) {
            setTokenError(error instanceof Error ? error.message : 'Erreur lors de la connexion OAuth');
            setOauthLoading(false);
        }
    };

    const handleNext = async () => {
        if (currentStep === steps.length - 1) {
            // Dernière étape (seulement pour l'extension)
            if (variant === 'extension' && !clipboardPermission) {
                setTokenError('Veuillez autoriser l\'accès au presse-papier');
                return;
            }
            if (!notionToken) {
                setTokenError('Connexion Notion non terminée');
                return;
            }
            onComplete(notionToken);
        } else if (steps[currentStep].id === 'connect') {
            // ✨ Pour l'app, l'OAuth termine directement l'onboarding
            // ✨ Pour l'extension, on continue vers les permissions
            await handleOAuthFlow();
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            setTokenError('');
            // Reset si on revient à l'accueil
        }
    };

    const renderStepContent = () => {
        const step = steps[currentStep];

        switch (step.id) {
            case 'welcome':
                return (
                    <motion.div
                        className="text-center space-y-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Logo animé */}
                        <motion.div
                            className="flex justify-center"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <div className="relative">
                                <NotionClipperLogo size={96} />
                            </div>
                        </motion.div>

                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Bienvenue dans Clipper Pro
                            </h2>
                            <p className="text-gray-600 max-w-md mx-auto">
                                {variant === 'extension'
                                    ? "Capturez instantanément vos idées depuis n'importe quelle page web."
                                    : "L'outil ultime pour capturer et organiser vos idées dans Notion."
                                }
                            </p>
                        </div>

                        {/* Features cards */}
                        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                            <motion.div
                                className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl"
                                whileHover={{ scale: 1.05 }}
                            >
                                <Zap className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-700 font-medium">Capture Rapide</p>
                            </motion.div>
                            <motion.div
                                className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl"
                                whileHover={{ scale: 1.05 }}
                            >
                                <Database className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-700 font-medium">Organisation</p>
                            </motion.div>
                            <motion.div
                                className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl"
                                whileHover={{ scale: 1.05 }}
                            >
                                <Check className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-700 font-medium">Synchronisation</p>
                            </motion.div>
                        </div>
                    </motion.div>
                );

            // ✨ ÉTAPE SIMPLIFIÉE : Connexion directe avec Notion
            case 'connect':
                return (
                    <motion.div
                        className="w-full max-w-[420px]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Header avec vrai logo Notion */}
                        <motion.div
                            className="flex flex-col items-center mb-8"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {/* Vrai logo Notion - Image */}
                            <div className="mb-6 relative">
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                                    alt="Notion"
                                    className="w-16 h-16 object-contain drop-shadow-sm"
                                />
                            </div>

                            {/* Titre principal */}
                            <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight mb-2">
                                Connectez-vous à Notion
                            </h1>

                            {/* Description */}
                            <p className="text-[14px] text-gray-600 text-center leading-relaxed max-w-[340px]">
                                Autorisez Clipper à accéder en toute sécurité à votre espace de travail Notion
                            </p>
                        </motion.div>

                        {/* Bouton de connexion - Style Apple/Notion moderne */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="space-y-4"
                        >
                            {/* Bouton principal */}
                            <button
                                onClick={handleOAuthFlow}
                                disabled={oauthLoading}
                                className="group relative w-full overflow-hidden rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {/* Effet de hover subtil */}
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 group-hover:scale-105 transition-transform duration-300" />

                                {/* Contenu du bouton */}
                                <div className="relative flex items-center justify-center gap-3 px-6 py-4">
                                    {oauthLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span className="text-white font-medium text-[15px]">
                                                Connexion en cours...
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            {/* Logo Notion mini dans le bouton */}
                                            <img
                                                src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                                                alt=""
                                                className="w-5 h-5 object-contain"
                                            />
                                            <span className="text-white font-medium text-[15px]">
                                                Continuer avec Notion
                                            </span>
                                            <ArrowRight
                                                className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform"
                                                strokeWidth={2.5}
                                            />
                                        </>
                                    )}
                                </div>
                            </button>
                        </motion.div>

                        {/* Footer - Confidentialité */}
                        <motion.div
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
                                        Connexion sécurisée. Nous n'accédons qu'aux pages que vous autorisez explicitement.
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Message d'état - Design Apple */}
                        {tokenError && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="mt-4"
                            >
                                {tokenError.includes('✨') ? (
                                    // État de succès avec chargement
                                    <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[13px] font-semibold text-emerald-900 mb-1">
                                                Connexion réussie !
                                            </h4>
                                            <p className="text-[13px] text-emerald-700 leading-relaxed">
                                                Initialisation de l'application en cours...
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    // État d'erreur
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
                                                Erreur de connexion
                                            </h4>
                                            <p className="text-[13px] text-red-700 leading-relaxed">
                                                {tokenError}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                );

            case 'permissions':
                return (
                    <motion.div
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
                                Dernière étape : Permissions
                            </h3>
                            <p className="text-gray-600">
                                Autorisez l'accès au presse-papier pour capturer le contenu
                            </p>
                        </div>

                        {/* Permission card */}
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
                                            Accès au presse-papier
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Nécessaire pour capturer le contenu copié automatiquement
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
                                                        console.error('Erreur permission:', err);
                                                        setClipboardPermission(true);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                Autoriser l'accès
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Privacy note */}
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-600 leading-relaxed">
                                🔒 <strong>Respect de votre vie privée :</strong> Clipper Pro ne collecte que le contenu
                                que vous choisissez explicitement de capturer. Aucune donnée n'est partagée avec des tiers.
                            </p>
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 z-50 p-4 [color-scheme:light] dark:bg-gradient-to-br dark:from-blue-50 dark:via-purple-50 dark:to-pink-50">
            {/* Fond animé avec bulles colorées - Animations Tailwind blob */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-50">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob" style={{ animationDelay: '2s' }}></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob" style={{ animationDelay: '4s' }}></div>
                    <div className="absolute bottom-0 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob" style={{ animationDelay: '6s' }}></div>
                </div>
            </div>

            <motion.div
                className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden ${mode === 'compact' ? 'max-w-md w-full' : 'max-w-2xl w-full'
                    } dark:bg-white`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                {/* Progress bar */}
                <div className="h-1 bg-gray-100 dark:bg-gray-100">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Steps indicator */}
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-100">
                    <div className="flex items-center justify-center gap-3">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <motion.div
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
                                </motion.div>
                                {index < steps.length - 1 && (
                                    <ChevronRight size={16} className="mx-2 text-gray-300 dark:text-gray-300" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="px-8 py-8 min-h-[400px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {renderStepContent()}
                    </AnimatePresence>
                </div>

                {/* Actions */}
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
                            Retour
                        </button>

                        {/* Bouton seulement si ce n'est pas l'étape de connexion et pas la dernière étape */}
                        {(currentStep < steps.length - 1 && steps[currentStep].id !== 'connect') && (
                            <button
                                onClick={handleNext}
                                disabled={validating || oauthLoading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <>
                                    Continuer
                                    <ChevronRight size={16} />
                                </>
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}