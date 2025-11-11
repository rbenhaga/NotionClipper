/**
 * Settings Page Component
 *
 * Page de paramètres avec gestion d'abonnement complète
 *
 * Features:
 * - Affichage du tier actuel (Free/Premium/Grace)
 * - Upgrade vers Premium avec Stripe Checkout
 * - Gestion d'abonnement avec Stripe Customer Portal
 * - Affichage des quotas mensuels
 * - Design élégant style Apple/Notion
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Settings as SettingsIcon,
  CreditCard,
  FileText,
  Zap,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { useSubscriptionContext } from '../contexts/SubscriptionContext';
import { SubscriptionBadge } from '../components/subscription/SubscriptionBadge';
import { QuotaCounter } from '../components/subscription/QuotaCounter';
import { UpgradeModal } from '../components/subscription/UpgradeModal';
import { StripeCheckoutHelper } from '@notion-clipper/core-shared';
import type {
  Subscription,
  QuotaSummary,
  SubscriptionTier,
} from '@notion-clipper/core-shared';

export const SettingsPage: React.FC = () => {
  const { subscriptionService, quotaService } = useSubscriptionContext();

  // State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [quotas, setQuotas] = useState<QuotaSummary | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [sub, quotaSummary] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        quotaService.getQuotaSummary(),
      ]);

      setSubscription(sub);
      setQuotas(quotaSummary);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setError('Impossible de charger les données d\'abonnement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setIsLoadingCheckout(true);
    setIsUpgradeModalOpen(false);

    try {
      // Créer la session checkout
      const { url } = await subscriptionService.createCheckoutSession({
        success_url: 'notionclipper://subscription/success',
        cancel_url: 'notionclipper://subscription/canceled',
      });

      console.log('🎫 Opening Stripe Checkout:', url);

      // Ouvrir dans le navigateur
      StripeCheckoutHelper.openCheckoutUrl(url);

      // Écouter le retour
      const cleanup = StripeCheckoutHelper.listenForCheckoutReturn(
        async () => {
          console.log('✅ Payment successful! Reloading subscription...');
          await loadSubscriptionData();
          cleanup();
        },
        () => {
          console.log('❌ Payment canceled');
          cleanup();
        }
      );
    } catch (err) {
      console.error('Failed to create checkout:', err);
      alert('Impossible de créer la session de paiement. Veuillez réessayer.');
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!subscription || subscription.tier !== SubscriptionTier.PREMIUM) {
      return;
    }

    if (!subscription.stripe_customer_id) {
      alert(
        'Aucun compte Stripe associé. Vous devez d\'abord souscrire à un abonnement.'
      );
      return;
    }

    setIsLoadingPortal(true);

    try {
      const { url } = await subscriptionService.openCustomerPortal(
        'notionclipper://settings'
      );

      console.log('🎫 Opening Stripe Customer Portal:', url);

      StripeCheckoutHelper.openCheckoutUrl(url);
    } catch (err) {
      console.error('Failed to open portal:', err);
      alert('Impossible d\'ouvrir le portail de gestion. Veuillez réessayer.');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="settings-page flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Chargement des paramètres...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !subscription || !quotas) {
    return (
      <div className="settings-page flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'Erreur de chargement'}</p>
          <button onClick={loadSubscriptionData} className="btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const isPremium = subscription.tier === SubscriptionTier.PREMIUM;
  const isGracePeriod = subscription.tier === SubscriptionTier.GRACE_PERIOD;

  return (
    <div className="settings-page p-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon size={28} className="text-gray-700 dark:text-gray-300" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Paramètres
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Gérez votre abonnement et vos préférences
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section Abonnement */}
          <motion.section
            className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Crown size={24} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Abonnement
                </h2>
              </div>
              <SubscriptionBadge
                tier={subscription.tier}
                gracePeriodDaysRemaining={subscription.grace_period_days_remaining}
                size="md"
              />
            </div>

            {isPremium ? (
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle size={20} className="text-green-600 mt-0.5" />
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">
                      Accès Premium actif
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Vous bénéficiez de toutes les fonctionnalités sans limite
                    </p>
                  </div>
                </div>

                {subscription.current_period_end && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Prochain renouvellement:{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString(
                      'fr-FR',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }
                    )}
                  </p>
                )}

                <button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="
                    w-full sm:w-auto px-6 py-2.5 rounded-lg
                    bg-gray-900 dark:bg-white
                    text-white dark:text-gray-900
                    font-medium text-sm
                    hover:bg-gray-800 dark:hover:bg-gray-100
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                    flex items-center justify-center gap-2
                  "
                >
                  <CreditCard size={16} />
                  {isLoadingPortal ? 'Chargement...' : 'Gérer mon abonnement'}
                </button>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Factures, carte bancaire, annulation
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {isGracePeriod
                      ? 'Votre période d\'essai Premium se termine bientôt'
                      : 'Débloquez toutes les fonctionnalités avec Premium'}
                  </p>

                  <div className="space-y-2 mb-6">
                    {[
                      'Clips illimités chaque mois',
                      'Upload de fichiers sans limite',
                      'Mode Focus & Compact illimités',
                      'Support prioritaire',
                    ].map((feature, index) => (
                      <motion.div
                        key={feature}
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                      >
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  disabled={isLoadingCheckout}
                  className="
                    w-full px-6 py-3 rounded-lg
                    bg-gradient-to-r from-blue-600 to-purple-600
                    text-white font-semibold
                    hover:from-blue-700 hover:to-purple-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                    flex items-center justify-center gap-2
                    shadow-lg hover:shadow-xl
                  "
                >
                  <Zap size={18} />
                  {isLoadingCheckout ? 'Chargement...' : 'Passer à Premium - 3,99€/mois'}
                </button>

                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Shield size={12} />
                    <span>Paiement sécurisé</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>Sans engagement</span>
                </div>
              </div>
            )}
          </motion.section>

          {/* Section Quotas (si free ou grace period) */}
          {!isPremium && (
            <motion.section
              className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <FileText size={24} className="text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Utilisation mensuelle
                </h2>
              </div>

              <QuotaCounter
                summary={quotas}
                onUpgradeClick={() => setIsUpgradeModalOpen(true)}
              />
            </motion.section>
          )}

          {/* Section Informations */}
          <motion.section
            className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl border border-blue-200 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              💡 Bon à savoir
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>• Les quotas se réinitialisent tous les mois</li>
              <li>• Vous pouvez annuler votre abonnement à tout moment</li>
              <li>• Le paiement est sécurisé par Stripe</li>
              <li>• Support par email pour les membres Premium</li>
            </ul>
          </motion.section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Card Premium Features */}
          <motion.div
            className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-2xl text-white shadow-xl"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Crown size={20} className="text-yellow-400" />
              <h3 className="font-semibold">Premium</h3>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Prix</span>
                <span className="font-bold">3,99€/mois</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Engagement</span>
                <span className="font-bold">Aucun</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Clips</span>
                <span className="font-bold">Illimités</span>
              </div>
            </div>

            {!isPremium && (
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="
                  w-full py-2 rounded-lg
                  bg-white text-gray-900
                  font-semibold text-sm
                  hover:bg-gray-100
                  transition-colors
                "
              >
                Découvrir Premium
              </button>
            )}
          </motion.div>

          {/* Stats */}
          {subscription.created_at && (
            <motion.div
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Membre depuis
              </h4>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(subscription.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modal d'upgrade */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
};
