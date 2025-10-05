import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, ChevronLeft, Send, CheckCircle, AlertCircle, Loader,
    Database, Key, Eye, EyeOff, Sparkles, Zap, Check, Command, Layers, Clock,
    Shield, Rocket, Heart
} from 'lucide-react';

interface OnboardingProps {
    onComplete: () => void;
    onSaveConfig: (config: any) => Promise<void>;
    validateNotionToken?: (token: string) => Promise<{ success: boolean; error?: string }>;
    platformKey?: string; // 'Cmd' ou 'Ctrl'
}

interface OnboardingStep {
    id: string;
    title: string;
    icon: React.ReactNode;
    content: string;
}

/**
 * Composant Onboarding pour le premier lancement
 * Guide l'utilisateur dans la configuration initiale
 */
export function Onboarding({
    onComplete,
    onSaveConfig,
    validateNotionToken,
    platformKey = 'Ctrl'
}: OnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [config, setConfig] = useState({
        notionToken: '',
        previewPageId: ''
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
                // Si pas de fonction de validation, on considère que c'est valide
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
                message: error.message || 'Erreur de connexion'
            });
            return false;
        } finally {
            setValidating(false);
        }
    };

    const handleNext = async () => {
        if (currentStep === steps.length - 1) {
            await handleComplete();
            return;
        }

        if (steps[currentStep].id === 'notion') {
            const isValid = await validateToken();
            if (!isValid) return;
        }

        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleComplete = async () => {
        setCompleting(true);

        try {
            await onSaveConfig({ ...config, onboardingCompleted: true });
            await new Promise(resolve => setTimeout(resolve, 1000));
            onComplete();
        } catch (error) {
            console.error('Erreur completion:', error);
            setCompleting(false);
        }
    };

    const renderStepContent = () => {
        switch (steps[currentStep].content) {
            case 'welcome':
                return (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                            <Send size={40} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Bienvenue dans Notion Clipper Pro
                        </h2>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Capturez et organisez instantanément vos idées, liens et contenus
                            directement dans vos pages Notion préférées.
                        </p>
                        <div className="grid grid-cols-3 gap-4 pt-4">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <Zap size={20} className="text-blue-600" />
                                </div>
                                <p className="text-sm text-gray-600">Capture rapide</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <Database size={20} className="text-purple-600" />
                                </div>
                                <p className="text-sm text-gray-600">Organisation facile</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <CheckCircle size={20} className="text-green-600" />
                                </div>
                                <p className="text-sm text-gray-600">Synchronisation</p>
                            </div>
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
                                Entrez votre token d'intégration Notion pour accéder à vos pages
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Token d'intégration Notion
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNotionKey ? "text" : "password"}
                                        value={config.notionToken}
                                        onChange={(e) => {
                                            setConfig({ ...config, notionToken: e.target.value });
                                            setValidationResult(null);
                                        }}
                                        placeholder="secret_..."
                                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNotionKey(!showNotionKey)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showNotionKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {validationResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${validationResult.type === 'success'
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-red-50 text-red-700'
                                            }`}
                                    >
                                        {validationResult.type === 'success' ? (
                                            <CheckCircle size={16} />
                                        ) : (
                                            <AlertCircle size={16} />
                                        )}
                                        <span className="text-sm">{validationResult.message}</span>
                                    </motion.div>
                                )}
                            </div>

                            <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-800 mb-2">
                                    💡 Comment obtenir un token ?
                                </p>
                                <ol className="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
                                    <li>Visitez <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="underline font-medium">notion.so/my-integrations</a></li>
                                    <li>Créez une nouvelle intégration interne</li>
                                    <li>Copiez le token "Internal Integration Token"</li>
                                    <li>Partagez vos pages avec cette intégration</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                );

            case 'features':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <Rocket size={32} className="text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                Fonctionnalités principales
                            </h3>
                            <p className="text-sm text-gray-600">
                                Découvrez tout ce que vous pouvez faire
                            </p>
                        </div>

                        <div className="space-y-3">
                            <FeatureItem
                                icon={<Command size={20} className="text-purple-600" />}
                                title="Raccourci clavier"
                                description={`Utilisez ${platformKey}+Shift+N pour ouvrir l'application depuis n'importe où`}
                            />
                            <FeatureItem
                                icon={<Layers size={20} className="text-blue-600" />}
                                title="Multi-sélection"
                                description="Envoyez votre contenu vers plusieurs pages en une seule fois"
                            />
                            <FeatureItem
                                icon={<Clock size={20} className="text-green-600" />}
                                title="Historique intelligent"
                                description="Retrouvez rapidement vos pages les plus utilisées"
                            />
                            <FeatureItem
                                icon={<Heart size={20} className="text-red-600" />}
                                title="Favoris"
                                description="Marquez vos pages favorites pour un accès rapide"
                            />
                            <FeatureItem
                                icon={<Shield size={20} className="text-gray-600" />}
                                title="Sécurisé"
                                description="Vos tokens sont stockés localement et chiffrés"
                            />
                        </div>
                    </div>
                );

            case 'complete':
                return (
                    <div className="text-center space-y-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl"
                        >
                            <Check size={48} className="text-white" strokeWidth={3} />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Tout est prêt ! 🎉
                        </h2>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Vous pouvez maintenant commencer à utiliser Notion Clipper Pro.
                            Copiez du texte ou des images et envoyez-les directement vers vos pages Notion.
                        </p>
                        <div className="pt-4 space-y-2">
                            <p className="text-sm text-gray-500">
                                <strong>Astuce :</strong> Utilisez <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{platformKey}+Shift+N</kbd> pour ouvrir l'app rapidement
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
                {/* Progress Steps */}
                <div className="px-8 pt-8 pb-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <motion.div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${index === currentStep
                                                ? 'bg-blue-500 text-white shadow-lg'
                                                : index < currentStep
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-gray-200 text-gray-400'
                                            }`}
                                        animate={{ scale: index === currentStep ? 1.1 : 1 }}
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

                {/* Content */}
                <div className="p-8 min-h-[400px]">
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

                {/* Navigation */}
                <div className="flex items-center justify-between px-8 py-6 bg-gray-50 border-t border-gray-200">
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
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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