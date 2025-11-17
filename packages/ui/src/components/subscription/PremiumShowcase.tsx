/**
 * Premium Showcase Component
 *
 * Page marketing élégante présentant toutes les features Premium
 * Design: Apple/Notion - Minimaliste, élégant, convaincant
 *
 * Design Philosophy:
 * - Visual hierarchy claire
 * - Icons expressifs et cohérents
 * - Gradients subtils et modernes
 * - Animations fluides et naturelles
 * - CTAs encourageants (non-agressifs)
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Shield,
  Clock,
  Image,
  FileText,
  Focus,
  Minimize2,
  CloudOff,
  TrendingUp,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export interface PremiumShowcaseProps {
  onUpgradeClick?: (plan?: 'monthly' | 'annual') => void;
  className?: string;
}

export const PremiumShowcase: React.FC<PremiumShowcaseProps> = ({
  onUpgradeClick,
  className = '',
}) => {
  const features = [
    {
      icon: Zap,
      title: 'Clips Illimités',
      description: 'Capturez autant de contenus que vous voulez, sans limitation',
      gradient: 'from-blue-500 to-cyan-600',
      highlights: [
        'Aucune limite mensuelle',
        'Synchronisation temps réel',
        'Organisation avancée',
      ],
    },
    {
      icon: Shield,
      title: 'Fichiers Illimités',
      description: 'Images, PDFs, vidéos - téléversez tous vos fichiers sans restriction',
      gradient: 'from-purple-500 to-pink-600',
      highlights: [
        'Images haute résolution',
        'Documents PDF complets',
        'Vidéos et audio',
      ],
    },
    {
      icon: Clock,
      title: 'Modes Focus & Compact Illimités',
      description: 'Utilisez les modes optimisés autant que nécessaire',
      gradient: 'from-orange-500 to-yellow-600',
      highlights: [
        'Mode Focus sans limite de temps',
        'Mode Compact toujours disponible',
        'Productivité maximale',
      ],
    },
    {
      icon: CloudOff,
      title: 'Mode Offline Permanent',
      description: 'Travaillez sans connexion, vos données restent accessibles',
      gradient: 'from-green-500 to-emerald-600',
      highlights: [
        'Accès complet hors-ligne',
        'Synchronisation automatique',
        'Données toujours disponibles',
      ],
    },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${className}`}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-600/10 border border-purple-500/20 mb-6"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              Notion Clipper Premium
            </span>
          </motion.div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Libérez votre potentiel
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Passez à Premium et profitez de toutes les fonctionnalités sans limitation.
            Plus de quotas, plus de restrictions.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        {/* Additional Benefits */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Et ce n'est pas tout...
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BenefitItem
              icon={<TrendingUp />}
              title="Mises à jour prioritaires"
              description="Accédez aux nouvelles fonctionnalités en avant-première"
            />
            <BenefitItem
              icon={<Shield />}
              title="Support prioritaire"
              description="Assistance rapide et personnalisée"
            />
            <BenefitItem
              icon={<Sparkles />}
              title="Futures features Premium"
              description="Toutes les fonctionnalités avancées à venir"
            />
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {/* Monthly Plan */}
          <PricingCard
            title="Mensuel"
            price="9,99€"
            period="par mois"
            features={[
              'Toutes les fonctionnalités Premium',
              'Aucune limite d\'usage',
              'Support prioritaire',
              'Annulation à tout moment',
            ]}
            onSelect={() => onUpgradeClick?.('monthly')}
            gradient="from-purple-500 to-pink-600"
          />

          {/* Annual Plan - Popular */}
          <PricingCard
            title="Annuel"
            price="99,99€"
            period="par an"
            popular
            savings="Économisez 17%"
            features={[
              'Toutes les fonctionnalités Premium',
              'Aucune limite d\'usage',
              'Support prioritaire',
              '2 mois offerts',
            ]}
            onSelect={() => onUpgradeClick?.('annual')}
            gradient="from-blue-500 to-cyan-600"
          />
        </motion.div>

        {/* Footer CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Garantie satisfait ou remboursé 30 jours · Paiement sécurisé · Annulation à tout moment
          </p>
        </motion.div>
      </div>
    </div>
  );
};

/**
 * Feature Card - Carte de présentation d'une fonctionnalité Premium
 */
interface FeatureCardProps {
  feature: {
    icon: React.ElementType;
    title: string;
    description: string;
    gradient: string;
    highlights: string[];
  };
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, index }) => {
  const Icon = feature.icon;

  return (
    <motion.div
      className="group relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.5 }}
      whileHover={{ y: -4 }}
    >
      {/* Gradient border effect */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
      />

      {/* Icon */}
      <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}>
        <Icon size={28} className="text-white" strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div className="relative">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {feature.title}
        </h3>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {feature.description}
        </p>

        {/* Highlights */}
        <ul className="space-y-2">
          {feature.highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-2 text-sm">
              <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};

/**
 * Benefit Item - Petit item pour les bénéfices additionnels
 */
interface BenefitItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const BenefitItem: React.FC<BenefitItemProps> = ({ icon, title, description }) => (
  <div className="flex flex-col items-center text-center">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white mb-4">
      {React.cloneElement(icon as React.ReactElement, { size: 20, strokeWidth: 2.5 })}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      {description}
    </p>
  </div>
);

/**
 * Pricing Card - Carte de pricing avec plan
 */
interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  features: string[];
  onSelect: () => void;
  gradient: string;
  popular?: boolean;
  savings?: string;
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  period,
  features,
  onSelect,
  gradient,
  popular = false,
  savings,
}) => (
  <div
    className={`
      relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg
      ${popular ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
    `}
  >
    {/* Popular badge */}
    {popular && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white text-xs font-semibold shadow-lg">
          <Sparkles size={12} />
          Le plus populaire
        </span>
      </div>
    )}

    {/* Title */}
    <div className="text-center mb-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {savings && (
        <span className="inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold">
          {savings}
        </span>
      )}
    </div>

    {/* Price */}
    <div className="text-center mb-8">
      <div className="flex items-baseline justify-center gap-2">
        <span className="text-4xl font-bold text-gray-900 dark:text-white">
          {price}
        </span>
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {period}
      </span>
    </div>

    {/* Features */}
    <ul className="space-y-3 mb-8">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2">
          <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
        </li>
      ))}
    </ul>

    {/* CTA Button */}
    <button
      onClick={onSelect}
      className={`
        w-full px-6 py-4 rounded-xl font-semibold text-white
        bg-gradient-to-r ${gradient}
        shadow-lg hover:shadow-xl
        transform hover:scale-[1.02] active:scale-[0.98]
        transition-all duration-200
      `}
    >
      Choisir ce plan
    </button>
  </div>
);
