// packages/ui/src/components/subscription/WelcomePremiumModal.tsx
// Modal de bienvenue Premium - Design inspiré de l'onboarding
import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '../common/MotionWrapper';
import {
    Sparkles,
    Infinity,
    Files,
    Zap,
    Headphones,
    Info,
    X,
    ArrowRight,
    Shield,
    Check
} from 'lucide-react';
import { useTranslation } from '@notion-clipper/i18n';

export interface WelcomePremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartTrial: () => void;
    onStayFree: () => void;
}

export function WelcomePremiumModal({
    isOpen,
    onClose,
    onStartTrial,
    onStayFree
}: WelcomePremiumModalProps) {
    const { t } = useTranslation();
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleStartTrial = async () => {
        setIsProcessing(true);
        await onStartTrial();
        setIsProcessing(false);
    };

    const handleStayFree = () => {
        onStayFree();
        onClose();
    };

    const features = [
        {
            icon: Infinity,
            title: 'Clips illimités',
            description: 'Aucune limite mensuelle'
        },
        {
            icon: Files,
            title: 'Fichiers illimités',
            description: 'Uploadez autant que vous voulez'
        },
        {
            icon: Zap,
            title: 'Modes Focus & Compact',
            description: 'Temps d\'utilisation illimité'
        },
        {
            icon: Headphones,
            title: 'Support prioritaire',
            description: 'Réponse rapide à vos questions'
        }
    ];

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <MotionDiv
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-[#191919] rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header avec close button */}
                <div className="relative p-8 pb-6">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={18} className="text-gray-400 dark:text-gray-500" />
                    </button>

                    {/* Icon animé */}
                    <MotionDiv
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                    >
                        <Sparkles size={36} className="text-white" strokeWidth={2} />
                    </MotionDiv>

                    {/* Title */}
                    <MotionDiv
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                    >
                        <h2 className="text-3xl font-bold text-center mb-3 text-gray-900 dark:text-white">
                            Bienvenue sur Clipper Pro ! 🎉
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-center text-lg">
                            Profitez de <strong className="text-gray-900 dark:text-white">14 jours d'essai gratuit</strong> pour découvrir toutes les fonctionnalités Premium
                        </p>
                    </MotionDiv>
                </div>

                {/* Features Grid */}
                <div className="px-8 pb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <MotionDiv
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + index * 0.05, duration: 0.3 }}
                                    className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                        <Icon size={20} className="text-white" strokeWidth={2} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[14px] font-semibold text-gray-900 dark:text-white mb-0.5">
                                            {feature.title}
                                        </p>
                                        <p className="text-[12px] text-gray-600 dark:text-gray-400">
                                            {feature.description}
                                        </p>
                                    </div>
                                </MotionDiv>
                            );
                        })}
                    </div>

                    {/* Info Trial Box */}
                    <MotionDiv
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.3 }}
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-900/30 p-5 mb-6"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <Info size={20} className="text-blue-600 dark:text-blue-400" strokeWidth={2} />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900 dark:text-white mb-2">
                                    Comment ça marche ?
                                </p>
                                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                                        <span><strong>14 jours gratuits</strong> pour tester toutes les fonctionnalités</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                                        <span>Carte bancaire requise (non débitée pendant l'essai)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                                        <span>Annulation possible à tout moment</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                                        <span><strong>2,99€/mois</strong> après l'essai si vous continuez</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </MotionDiv>

                    {/* Actions */}
                    <div className="space-y-3">
                        {/* Primary: Start Trial */}
                        <MotionDiv
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.3 }}
                        >
                            <button
                                onClick={handleStartTrial}
                                disabled={isProcessing}
                                className="group w-full relative overflow-hidden py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isProcessing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                            <span>Chargement...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={20} strokeWidth={2} />
                                            <span>Démarrer l'essai gratuit (14 jours)</span>
                                            <ArrowRight size={20} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </span>
                                {/* Gradient overlay on hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            </button>
                        </MotionDiv>

                        {/* Secondary: Stay Free */}
                        <MotionDiv
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7, duration: 0.3 }}
                        >
                            <button
                                onClick={handleStayFree}
                                disabled={isProcessing}
                                className="w-full py-4 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
                            >
                                Peut-être plus tard, rester en gratuit
                            </button>
                        </MotionDiv>
                    </div>

                    {/* Footer */}
                    <MotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800"
                    >
                        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                                <Shield size={14} />
                                <span>Paiement sécurisé par Stripe</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-gray-300" />
                            <span>Sans engagement</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                            Vous pourrez passer à Premium plus tard depuis les paramètres
                        </p>
                    </MotionDiv>
                </div>
            </MotionDiv>
        </div>
    );
}
