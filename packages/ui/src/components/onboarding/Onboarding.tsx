// packages/ui/src/components/onboarding/Onboarding.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Onboarding.css';
import {
    ChevronRight,
    Check,
    Copy,
    ExternalLink,
    Sparkles,
    Key,
    Zap,
    ArrowRight,
    Loader,
    Database,
    Eye,
    EyeOff
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

    // 🆕 États pour OAuth
    const [authMethod, setAuthMethod] = useState<'oauth' | 'apikey' | null>(null);
    const [oauthLoading, setOauthLoading] = useState(false);
    // Configuration adaptée selon la variante
    const steps = variant === 'extension' ? [
        { id: 'welcome', title: 'Bienvenue' },
        { id: 'method', title: 'Méthode' },
        { id: 'notion', title: 'Connexion' },
        { id: 'permissions', title: 'Permissions' }
    ] : [
        { id: 'welcome', title: 'Bienvenue' },
        { id: 'method', title: 'Méthode de connexion' },
        { id: 'notion', title: 'Connexion Notion' }
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
        setOauthLoading(true);
        setTokenError('');

        try {
            console.log('[Onboarding] Checking electronAPI...', !!(window as any).electronAPI);
            console.log('[Onboarding] Checking invoke...', !!(window as any).electronAPI?.invoke);
            console.log('[Onboarding] Checking openExternal...', !!(window as any).electronAPI?.openExternal);

            if ((window as any).electronAPI?.invoke) {
                console.log('[Onboarding] Starting OAuth flow...');

                const result = await (window as any).electronAPI.invoke('notion:startOAuth', 'user@example.com');
                console.log('[Onboarding] OAuth result:', result);

                if (result.success && result.authUrl) {
                    // Ouvrir l'URL OAuth dans le navigateur
                    console.log('[Onboarding] Opening OAuth URL:', result.authUrl);
                    await (window as any).electronAPI.invoke('open-external', result.authUrl);

                    // Définir un token temporaire pour indiquer que l'OAuth est en cours
                    setNotionToken('oauth_pending_' + Date.now());
                    setOauthLoading(false);
                    setTokenError('');

                    // Terminer l'onboarding immédiatement - le callback OAuth gérera la suite
                    console.log('[Onboarding] OAuth URL opened, completing onboarding...');
                    onComplete('oauth_pending_' + Date.now());
                } else {
                    setTokenError(result.error || 'Erreur lors du démarrage OAuth');
                    setOauthLoading(false);
                }
            } else {
                setTokenError('API Electron non disponible');
                setOauthLoading(false);
            }
        } catch (error) {
            console.error('[Onboarding] OAuth error:', error);
            setTokenError('Erreur lors de la connexion OAuth');
            setOauthLoading(false);
        }
    };

    const handleNext = async () => {
        if (currentStep === steps.length - 1) {
            // Dernière étape
            if (variant === 'extension' && !clipboardPermission) {
                setTokenError('Veuillez autoriser l\'accès au presse-papier');
                return;
            }
            // Pour OAuth, on a déjà un token temporaire, pour API key on vérifie qu'il y en a un
            if (authMethod === 'apikey' && !notionToken) {
                setTokenError('Veuillez configurer votre token Notion');
                return;
            }
            if (authMethod === 'oauth' && !notionToken) {
                setTokenError('Connexion OAuth non terminée');
                return;
            }
            onComplete(notionToken);
        } else if (steps[currentStep].id === 'method') {
            if (!authMethod) {
                setTokenError('Veuillez choisir une méthode de connexion');
                return;
            }
            setCurrentStep(currentStep + 1);
        } else if (steps[currentStep].id === 'notion') {
            if (authMethod === 'oauth') {
                await handleOAuthFlow();
            } else {
                const isValid = await handleTokenValidation();
                if (isValid) {
                    setCurrentStep(currentStep + 1);
                }
            }
        } else {
            setCurrentStep(currentStep + 1);
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

            case 'method':
                return (
                    <motion.div
                        className="space-y-6"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Sparkles size={28} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Choisissez votre méthode de connexion
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Sélectionnez la méthode qui vous convient le mieux
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* OAuth Method - Premium Design */}
                            <motion.button
                                onClick={() => {
                                    setAuthMethod('oauth');
                                    setTokenError('');
                                }}
                                className={`w-full p-6 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${authMethod === 'oauth'
                                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 shadow-lg'
                                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md bg-white'
                                    }`}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* Gradient overlay for selected state */}
                                {authMethod === 'oauth' && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5" />
                                )}

                                <div className="flex items-start gap-4 relative z-10">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${authMethod === 'oauth'
                                        ? 'bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg'
                                        : 'bg-gray-100'
                                        }`}>
                                        <Sparkles size={20} className={authMethod === 'oauth' ? 'text-white' : 'text-gray-400'} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-gray-900">
                                                Connexion OAuth
                                            </h4>
                                            <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-blue-600 text-white text-xs rounded-full font-medium">
                                                Recommandé
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Connexion rapide et sécurisée via votre navigateur
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                                                ✨ Rapide
                                            </span>
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                                🔐 Sécurisé
                                            </span>
                                            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                                🚀 Multi-workspace
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${authMethod === 'oauth'
                                        ? 'border-purple-500 bg-purple-500'
                                        : 'border-gray-300'
                                        }`}>
                                        {authMethod === 'oauth' && (
                                            <Check size={14} className="text-white" />
                                        )}
                                    </div>
                                </div>
                            </motion.button>

                            {/* API Key Method */}
                            <motion.button
                                onClick={() => {
                                    setAuthMethod('apikey');
                                    setTokenError('');
                                }}
                                className={`w-full p-6 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${authMethod === 'apikey'
                                    ? 'border-gray-500 bg-gradient-to-br from-gray-50 to-slate-50 shadow-lg'
                                    : 'border-gray-200 hover:border-gray-400 hover:shadow-md bg-white'
                                    }`}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${authMethod === 'apikey'
                                        ? 'bg-gradient-to-br from-gray-600 to-slate-700 shadow-lg'
                                        : 'bg-gray-100'
                                        }`}>
                                        <Key size={20} className={authMethod === 'apikey' ? 'text-white' : 'text-gray-400'} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 mb-1">
                                            Token d'intégration
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-3">
                                            Connexion manuelle avec votre token Notion
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                                                🔑 Classique
                                            </span>
                                            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                                ⚙️ Avancé
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${authMethod === 'apikey'
                                        ? 'border-gray-500 bg-gray-500'
                                        : 'border-gray-300'
                                        }`}>
                                        {authMethod === 'apikey' && (
                                            <Check size={14} className="text-white" />
                                        )}
                                    </div>
                                </div>
                            </motion.button>
                        </div>

                        {tokenError && (
                            <motion.div
                                className="p-4 bg-red-50 border border-red-200 rounded-xl"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <p className="text-red-600 text-sm font-medium">{tokenError}</p>
                            </motion.div>
                        )}
                    </motion.div>
                );

            case 'notion':
                return (
                    <motion.div
                        className="space-y-6"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="text-center">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${authMethod === 'oauth'
                                ? 'bg-gradient-to-br from-purple-500 to-blue-600'
                                : 'bg-gray-900'
                                }`}>
                                {authMethod === 'oauth' ? (
                                    <Sparkles size={24} className="text-white" />
                                ) : (
                                    <Key size={24} className="text-white" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {authMethod === 'oauth' ? 'Connexion OAuth' : 'Connexion à votre espace Notion'}
                            </h3>
                            <p className="text-sm text-gray-600 max-w-sm mx-auto">
                                {authMethod === 'oauth'
                                    ? 'Connectez-vous rapidement via votre navigateur'
                                    : 'Connectez Clipper Pro à votre espace de travail Notion pour commencer à capturer.'
                                }
                            </p>
                        </div>

                        {authMethod === 'oauth' ? (
                            /* OAuth Flow - Design Premium */
                            <div className="space-y-6">
                                {/* Info OAuth */}
                                <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-100">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Sparkles size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-2">Pourquoi OAuth ?</h4>
                                            <ul className="space-y-1 text-sm text-gray-600">
                                                <li className="flex items-center gap-2">
                                                    <Check size={14} className="text-emerald-500 flex-shrink-0" />
                                                    <span>Accès à plusieurs workspaces</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check size={14} className="text-emerald-500 flex-shrink-0" />
                                                    <span>Pas besoin de créer un token manuellement</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check size={14} className="text-emerald-500 flex-shrink-0" />
                                                    <span>Révocation facile depuis Notion</span>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <Check size={14} className="text-emerald-500 flex-shrink-0" />
                                                    <span>Plus sécurisé</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {tokenError && (
                                    <motion.div
                                        className={`p-4 rounded-xl border ${tokenError.includes('✨')
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'bg-red-50 border-red-200 text-red-600'
                                            }`}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        <p className="text-sm font-medium">{tokenError}</p>
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            /* API Key Flow - Design classique amélioré */
                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Token d'intégration
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNotionKey ? 'text' : 'password'}
                                            value={notionToken}
                                            onChange={(e) => {
                                                setNotionToken(e.target.value);
                                                setTokenError('');
                                            }}
                                            placeholder="ntn..."
                                            className={`w-full px-4 py-3 pr-12 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${tokenError
                                                ? 'border-red-300 focus:ring-red-200 bg-red-50'
                                                : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNotionKey(!showNotionKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showNotionKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {tokenError && (
                                        <motion.p
                                            className="mt-2 text-sm text-red-600 flex items-center gap-1"
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <span className="inline-block w-1 h-1 bg-red-600 rounded-full" />
                                            {tokenError}
                                        </motion.p>
                                    )}
                                </div>

                                {/* Guide d'obtention du token */}
                                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                        Comment obtenir votre token ?
                                    </p>
                                    <ol className="space-y-2 text-sm text-gray-600">
                                        <li className="flex items-start gap-2">
                                            <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-semibold text-gray-700 mt-0.5">
                                                1
                                            </span>
                                            <span>Allez dans <strong>Paramètres & Membres</strong> → <strong>Connexions</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-semibold text-gray-700 mt-0.5">
                                                2
                                            </span>
                                            <span>Créez une nouvelle intégration</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-semibold text-gray-700 mt-0.5">
                                                3
                                            </span>
                                            <span>Copiez le token <strong>"Internal Integration Token"</strong></span>
                                        </li>
                                    </ol>
                                    <a
                                        href="https://www.notion.so/my-integrations"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
                                    >
                                        Ouvrir les intégrations Notion
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
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
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Copy size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Permissions requises
                            </h3>
                            <p className="text-sm text-gray-600 max-w-sm mx-auto">
                                Clipper Pro a besoin de votre autorisation pour capturer du contenu.
                            </p>
                        </div>

                        {/* Permission card */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${clipboardPermission
                                        ? 'bg-emerald-500'
                                        : 'bg-white border-2 border-gray-200'
                                        }`}>
                                        {clipboardPermission ? (
                                            <Check size={20} className="text-white" />
                                        ) : (
                                            <Copy size={20} className="text-gray-400" />
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 mb-1">
                                        Accès au presse-papier
                                    </h4>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Permet de capturer automatiquement le contenu que vous copiez.
                                    </p>
                                    {!clipboardPermission && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    // API Chrome pour demander la permission
                                                    if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome?.permissions) {
                                                        const granted = await (window as any).chrome.permissions.request({
                                                            permissions: ['clipboardRead']
                                                        });
                                                        setClipboardPermission(granted);
                                                    } else if (navigator?.permissions) {
                                                        // API standard pour Firefox
                                                        const result = await navigator.permissions.query({
                                                            name: 'clipboard-read' as PermissionName
                                                        });
                                                        setClipboardPermission(result.state === 'granted');
                                                    } else {
                                                        // Fallback - simuler l'autorisation
                                                        setClipboardPermission(true);
                                                    }
                                                } catch (err) {
                                                    console.error('Erreur permission:', err);
                                                    // En cas d'erreur, on considère que c'est autorisé pour ne pas bloquer
                                                    setClipboardPermission(true);
                                                }
                                            }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            Autoriser l'accès
                                        </button>
                                    )}
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
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 z-50 p-4">
            {/* Fond animé avec bulles colorées */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-50">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
                    <div className="absolute bottom-0 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-6000"></div>
                </div>
            </div>
            <motion.div
                className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden ${mode === 'compact' ? 'max-w-md w-full' : 'max-w-2xl w-full'
                    }`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                {/* Progress bar */}
                <div className="h-1 bg-gray-100">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Steps indicator */}
                <div className="px-8 py-6 border-b border-gray-100">
                    <div className="flex items-center justify-center gap-3">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <motion.div
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${index === currentStep
                                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                                        : index < currentStep
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-gray-100 text-gray-400'
                                        }`}
                                    animate={index === currentStep ? { scale: [1, 1.05, 1] } : {}}
                                    transition={{ duration: 0.5 }}
                                >
                                    {index < currentStep ? (
                                        <Check size={14} />
                                    ) : (
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center ${index === currentStep ? 'bg-white/20' : 'bg-gray-300'
                                            }`}>
                                            {index + 1}
                                        </span>
                                    )}
                                    <span>{step.title}</span>
                                </motion.div>
                                {index < steps.length - 1 && (
                                    <ChevronRight size={16} className="mx-2 text-gray-300" />
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
                <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handlePrevious}
                            disabled={currentStep === 0}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${currentStep === 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            Retour
                        </button>

                        <button
                            onClick={handleNext}
                            disabled={validating || oauthLoading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {validating || oauthLoading ? (
                                <>
                                    <Loader size={16} className="animate-spin" />
                                    {oauthLoading ? 'Connexion OAuth...' : 'Validation...'}
                                </>
                            ) : currentStep === steps.length - 1 ? (
                                <>
                                    Commencer
                                    <ArrowRight size={16} />
                                </>
                            ) : steps[currentStep].id === 'notion' && authMethod === 'oauth' ? (
                                <>
                                    <Sparkles size={16} />
                                    Se connecter avec OAuth
                                </>
                            ) : (
                                <>
                                    Continuer
                                    <ChevronRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>


        </div>
    );
}