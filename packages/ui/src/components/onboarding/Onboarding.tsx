// packages/ui/src/components/onboarding/Onboarding.tsx - RESPONSIVE FIXED
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, ChevronLeft, Send, CheckCircle, AlertCircle, Loader,
    Database, Key, Eye, EyeOff, Sparkles, Zap, Check, Command, Layers, Clock,
    Shield, Rocket, Heart
} from 'lucide-react';

interface OnboardingProps {
    onComplete: (data?: { token?: string; notionToken?: string }) => void;
    onSaveConfig: (config: any) => Promise<void>;
    validateNotionToken?: (token: string) => Promise<{ success: boolean; error?: string }>;
    platformKey?: string; // 'Cmd' ou 'Ctrl'
    /**
     * Mode responsive pour extension web
     * default: pour app Electron (600px min-height)
     * compact: pour extension web (adapté à 700x800px)
     */
    mode?: 'default' | 'compact';
}

interface OnboardingStep {
    id: string;
    title: string;
    icon: React.ReactNode;
    content: string;
}

/**
 * ✅ CORRIGÉ : Composant Onboarding responsive
 * - Mode default: pour app Electron (600px min-height)
 * - Mode compact: pour extension web (s'adapte à 700x800px)
 */
export function Onboarding({
    onComplete,
    onSaveConfig,
    validateNotionToken,
    platformKey = 'Ctrl',
    mode = 'default'
}: OnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [config, setConfig] = useState({
        notionToken: ''
    });
    const [showNotionKey, setShowNotionKey] = useState(false);
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);
    const [completing, setCompleting] = useState(false);

    const steps: OnboardingStep[] = [
        { id: 'welcome', title: 'Bienvenue', icon: <Sparkles size={20} />, content: 'welcome' },
        { id: 'notion', title: 'Configuration Notion', icon: <Key size={20} />, content: 'notion' },
        { id: 'features', title: 'Fonctionnalités', icon: <Zap size={20} />, content: 'features' },
        { id: 'complete', title: 'Terminé', icon: <CheckCircle size={20} />, content: 'complete' }
    ];

    const validateToken = async () => {
        if (!config.notionToken.trim()) {
            setValidationResult({
                type: 'error',
                message: 'Veuillez entrer votre token Notion'
            });
            return false;
        }

        setValidating(true);
        setValidationResult(null);

        try {
            if (!validateNotionToken) {
                setValidationResult({
                    type: 'success',
                    message: 'Token enregistré avec succès !'
                });
                return true;
            }

            const result = await validateNotionToken(config.notionToken.trim());

            if (result.success) {
                setValidationResult({
                    type: 'success',
                    message: 'Token validé avec succès !'
                });
                return true;
            } else {
                setValidationResult({
                    type: 'error',
                    message: result.error || 'Token invalide'
                });
                return false;
            }
        } catch (error: any) {
            setValidationResult({
                type: 'error',
                message: error.message || 'Erreur lors de la validation'
            });
            return false;
        } finally {
            setValidating(false);
        }
    };

    const handleNext = async () => {
        if (currentStep === 1 && config.notionToken) {
            const isValid = await validateToken();
            if (!isValid) return;
        }

        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
            setValidationResult(null);
        } else {
            await handleComplete();
        }
    };

    const handleComplete = async () => {
        setCompleting(true);
        try {
            await onSaveConfig({
                notionToken: config.notionToken,
                onboardingCompleted: true
            });
            onComplete({
                token: config.notionToken,
                notionToken: config.notionToken
            });
        } catch (error: any) {
            setValidationResult({
                type: 'error',
                message: error.message || 'Erreur lors de la sauvegarde'
            });
        } finally {
            setCompleting(false);
        }
    };

    const renderStepContent = () => {
        switch (steps[currentStep].id) {
            case 'welcome':
                return (
                    <div className="space-y-6 text-center">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                                <Sparkles size={40} className="text-white" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3">
                                Bienvenue sur Notion Clipper Pro
                            </h2>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Capturez et organisez vos idées directement dans Notion.
                                Configuration en quelques étapes simples.
                            </p>
                        </div>
                        {/* ✅ Responsive grid */}
                        <div className={`grid ${mode === 'compact' ? 'grid-cols-2' : 'grid-cols-3'} gap-4 pt-4`}>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <Zap size={20} className="text-blue-600" />
                                </div>
                                <p className="text-xs text-gray-600">Capture rapide</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <Database size={20} className="text-purple-600" />
                                </div>
                                <p className="text-xs text-gray-600">Organisation facile</p>
                            </div>
                            {mode !== 'compact' && (
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                        <CheckCircle size={20} className="text-green-600" />
                                    </div>
                                    <p className="text-xs text-gray-600">Synchronisation</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'notion':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <Database size={32} className="text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                Connexion à Notion
                            </h3>
                            <p className="text-sm text-gray-600">
                                Entrez votre token d'intégration Notion
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Token d'intégration Notion
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNotionKey ? 'text' : 'password'}
                                        value={config.notionToken}
                                        onChange={(e) => setConfig({ ...config, notionToken: e.target.value })}
                                        placeholder="ntn..."
                                        className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNotionKey(!showNotionKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showNotionKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {validationResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex items-start gap-3 p-3 rounded-lg ${validationResult.type === 'success'
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-red-50 border border-red-200'
                                        }`}
                                >
                                    {validationResult.type === 'success' ? (
                                        <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                    )}
                                    <p className={`text-sm ${validationResult.type === 'success' ? 'text-green-800' : 'text-red-800'
                                        }`}>
                                        {validationResult.message}
                                    </p>
                                </motion.div>
                            )}

                            {/* ✅ Responsive instructions */}
                            <div className={`bg-blue-50 border border-blue-200 rounded-lg p-${mode === 'compact' ? '3' : '4'}`}>
                                <div className="flex items-start gap-2">
                                    <Key size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-blue-800">
                                        <p className="font-medium mb-1">Comment obtenir votre token ?</p>
                                        <ol className="list-decimal list-inside space-y-1 text-xs">
                                            <li>Allez sur <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="underline">notion.so/my-integrations</a></li>
                                            <li>Créez une nouvelle intégration</li>
                                            <li>Copiez le token "Internal Integration Token"</li>
                                            <li>Partagez vos pages avec l'intégration</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'features':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                Fonctionnalités principales
                            </h3>
                            <p className="text-sm text-gray-600">
                                Découvrez ce que Notion Clipper Pro peut faire pour vous
                            </p>
                        </div>

                        {/* ✅ Responsive features grid */}
                        <div className={`space-y-${mode === 'compact' ? '2' : '3'}`}>
                            <FeatureItem
                                icon={<Zap size={20} className="text-blue-600" />}
                                title="Capture instantanée"
                                description={mode === 'compact' ? 'Raccourci clavier rapide' : `Utilisez ${platformKey}+Shift+C pour capturer n'importe quel contenu`}
                            />
                            <FeatureItem
                                icon={<Layers size={20} className="text-purple-600" />}
                                title="Multi-destinations"
                                description="Envoyez vers plusieurs pages simultanément"
                            />
                            {mode !== 'compact' && (
                                <FeatureItem
                                    icon={<Clock size={20} className="text-green-600" />}
                                    title="Synchronisation auto"
                                    description="Vos pages Notion toujours à jour"
                                />
                            )}
                            <FeatureItem
                                icon={<Shield size={20} className="text-orange-600" />}
                                title="Sécurisé"
                                description="Vos données restent privées et chiffrées"
                            />
                        </div>
                    </div>
                );

            case 'complete':
                return (
                    <div className="space-y-6 text-center">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-xl">
                                <CheckCircle size={40} className="text-white" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3">
                                Tout est prêt ! 🎉
                            </h2>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                Vous pouvez maintenant commencer à capturer vos idées vers Notion.
                                Utilisez le raccourci {platformKey}+Shift+C pour commencer.
                            </p>
                        </div>
                        <div className="flex justify-center gap-6 pt-4">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <Heart size={20} className="text-purple-600" />
                                </div>
                                <p className="text-xs text-gray-600">Profitez-en !</p>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // ✅ Classes responsives basées sur le mode
    const containerClasses = mode === 'compact'
        ? 'max-h-[800px] h-[800px] flex flex-col' // Extension: hauteur fixe 800px
        : 'min-h-[600px]'; // App: min-height classique

    const contentClasses = mode === 'compact'
        ? 'flex-1 overflow-y-auto px-6 py-4' // Extension: scroll si nécessaire
        : 'p-8 min-h-[400px]'; // App: padding normal

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                className={`w-full max-w-2xl bg-white rounded-2xl shadow-2xl ${containerClasses}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                {/* Progress bar */}
                <div className="px-6 pt-6">
                    <div className="flex items-center justify-between mb-4">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                    <motion.div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${index === currentStep
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                            : index < currentStep
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-200 text-gray-400'
                                            }`}
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        {index < currentStep ? <Check size={20} /> : step.icon}
                                    </motion.div>
                                    <span className={`text-xs mt-2 font-medium ${index === currentStep ? 'text-blue-600' : 'text-gray-500'
                                        }`}>
                                        {step.title}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`h-0.5 w-12 mx-2 ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content - ✅ Responsive avec scroll */}
                <div className={contentClasses}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderStepContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation - ✅ Sticky en bas pour extension */}
                <div className={`flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 ${mode === 'compact' ? 'sticky bottom-0' : ''
                    }`}>
                    <button
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={20} />
                        Précédent
                    </button>

                    <div className="flex gap-1">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`h-2 w-2 rounded-full transition-all ${index === currentStep
                                    ? 'bg-blue-500 w-8'
                                    : index < currentStep
                                        ? 'bg-green-500'
                                        : 'bg-gray-300'
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={validating || completing}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                    >
                        {completing ? (
                            <>
                                <Loader size={20} className="animate-spin" />
                                Finalisation...
                            </>
                        ) : validating ? (
                            <>
                                <Loader size={20} className="animate-spin" />
                                Validation...
                            </>
                        ) : currentStep === steps.length - 1 ? (
                            <>
                                Commencer
                                <Rocket size={20} />
                            </>
                        ) : (
                            <>
                                Suivant
                                <ChevronRight size={20} />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// Composant auxiliaire pour les fonctionnalités
function FeatureItem({ icon, title, description }: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm">
                {icon}
            </div>
            <div>
                <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
                <p className="text-xs text-gray-600 mt-1">{description}</p>
            </div>
        </div>
    );
}