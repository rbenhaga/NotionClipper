/**
 * SubscriptionSection - Abonnement avec accent violet/fuchsia
 */

import React, { useState, useEffect } from 'react';
import { Crown, Zap, Check, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscriptionContext } from '../../../contexts/SubscriptionContext';
import { SubscriptionTier, BETA_PRICING, StripeCheckoutHelper } from '@notion-clipper/core-shared';
import { SettingsCard, SettingsButton, SettingsBadge } from '../components/SettingsCard';

interface SubscriptionSectionProps {
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({ showNotification }) => {
  const [subscription, setSubscription] = useState<any>(null);
  const [quotas, setQuotas] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  let ctx: any = null;
  try { ctx = useSubscriptionContext(); } catch { ctx = null; }

  useEffect(() => {
    if (!ctx?.isServicesInitialized) return;
    const load = async () => {
      try {
        const [sub, q] = await Promise.all([
          ctx.subscriptionService.getCurrentSubscription(),
          ctx.quotaService.getQuotaSummary(),
        ]);
        setSubscription(sub);
        setQuotas(q);
      } catch (e) { console.error(e); }
    };
    load();
  }, [ctx?.isServicesInitialized]);

  const isPremium = subscription?.tier === SubscriptionTier.PREMIUM;

  const handleUpgrade = async () => {
    if (!ctx) return;
    setIsLoading(true);
    try {
      const { url } = await ctx.subscriptionService.createCheckoutSession({
        success_url: 'clipperpro://subscription/success',
        cancel_url: 'clipperpro://subscription/canceled',
      });
      StripeCheckoutHelper.openCheckoutUrl(url);
    } catch { showNotification?.('Erreur', 'error'); }
    finally { setIsLoading(false); }
  };

  const handleManage = async () => {
    if (!ctx || !subscription?.stripe_customer_id) return;
    setIsLoading(true);
    try {
      const { url } = await ctx.subscriptionService.openCustomerPortal('clipperpro://settings');
      StripeCheckoutHelper.openCheckoutUrl(url);
    } catch { showNotification?.('Erreur', 'error'); }
    finally { setIsLoading(false); }
  };

  const features = ['Clips illimités', 'Fichiers illimités', 'Modes Focus & Compact', 'Support prioritaire'];

  return (
    <div className="space-y-4 max-w-lg">
      {/* Current Plan */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl border ${
          isPremium 
            ? 'bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-500/20' 
            : 'bg-gray-50/80 dark:bg-white/[0.02] border-gray-200/50 dark:border-white/[0.04]'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown 
              size={16} 
              strokeWidth={1.5} 
              className={isPremium ? 'text-violet-500' : 'text-gray-400'} 
            />
            <span className="text-[14px] font-medium text-gray-800 dark:text-gray-100">
              {isPremium ? 'Premium' : 'Gratuit'}
            </span>
            {isPremium && <SettingsBadge variant="premium">Actif</SettingsBadge>}
          </div>
          {isPremium ? (
            <SettingsButton variant="secondary" size="sm" onClick={handleManage} loading={isLoading}>
              Gérer
            </SettingsButton>
          ) : (
            <SettingsButton variant="primary" size="sm" onClick={handleUpgrade} loading={isLoading} icon={Zap}>
              Upgrade
            </SettingsButton>
          )}
        </div>
        <p className="text-[12px] text-gray-500 dark:text-gray-400">
          {isPremium ? 'Accès illimité à toutes les fonctionnalités' : 'Fonctionnalités limitées'}
        </p>
      </motion.div>

      {/* Upgrade CTA */}
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-xl bg-gradient-to-br from-violet-500/[0.06] to-fuchsia-500/[0.06] border border-violet-500/15"
        >
          {/* Badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={12} className="text-violet-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Offre Beta
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-[14px] text-gray-400 line-through">{BETA_PRICING.ORIGINAL_PRICE}</span>
            <span className="text-[28px] font-bold text-violet-600 dark:text-violet-400">{BETA_PRICING.PRICE}</span>
            <span className="text-[12px] text-gray-500">/mois</span>
          </div>

          <p className="text-[11px] text-violet-600/80 dark:text-violet-400/80 mb-4">
            {BETA_PRICING.FOREVER_TEXT}
          </p>

          {/* Features */}
          <div className="space-y-2 mb-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-gray-300">
                <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                  <Check size={10} strokeWidth={2.5} className="text-white" />
                </div>
                {f}
              </div>
            ))}
          </div>

          <SettingsButton variant="primary" onClick={handleUpgrade} loading={isLoading} icon={Zap}>
            Passer à Premium
          </SettingsButton>
        </motion.div>
      )}

      {/* Quotas */}
      {quotas && (
        <SettingsCard title="Utilisation">
          <div className="space-y-3">
            {[
              { label: 'Clips', used: quotas.clips?.used || 0, limit: quotas.clips?.limit || 50 },
              { label: 'Fichiers', used: quotas.files?.used || 0, limit: quotas.files?.limit || 10 },
            ].map((q) => {
              const pct = q.limit === -1 ? 0 : Math.min((q.used / q.limit) * 100, 100);
              const unlimited = q.limit === -1;
              return (
                <div key={q.label}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-600 dark:text-gray-300">{q.label}</span>
                    <span className="text-gray-400 dark:text-gray-500">
                      {unlimited ? '∞' : `${q.used}/${q.limit}`}
                    </span>
                  </div>
                  {!unlimited && (
                    <div className="h-1.5 bg-gray-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-violet-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SettingsCard>
      )}
    </div>
  );
};
