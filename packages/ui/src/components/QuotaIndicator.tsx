/**
 * QuotaIndicator Component - Premium Design
 * 
 * Displays user's quota usage with gradient progress bar
 * and upgrade CTA for free users with i18n support
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Crown, TrendingUp } from 'lucide-react';
import { backendApiService, BETA_PRICING } from '@notion-clipper/core-shared';

interface QuotaData {
  tier: 'FREE' | 'PREMIUM';
  clips_used: number;
  clips_limit: number;
  percentage: number;
}

export function QuotaIndicator() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Textes statiques (pas de namespace i18n pour éviter le spam de logs)
  const texts = {
    premium: 'Premium',
    active: 'ACTIF',
    unlimited: 'Utilisation illimitée',
    clipsThisMonth: 'Clips ce mois',
    limitAlmostReached: 'Limite presque atteinte',
    quotaAlmostExhausted: 'Quota bientôt épuisé',
    upgradeToPremium: 'Passer à Premium',
  };
  
  useEffect(() => {
    fetchQuota();
    const interval = setInterval(fetchQuota, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  async function fetchQuota() {
    try {
      const userId = backendApiService.getUserId();
      if (!userId) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      
      const data = await backendApiService.getCurrentQuota(userId);
      
      setQuota({
        tier: data.tier,
        clips_used: data.clips_used,
        clips_limit: data.clips_limit,
        percentage: data.percentage
      });
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch quota:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  function handleUpgrade() {
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.send('open-upgrade-modal');
    }
  }
  
  if (loading) {
    return (
      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }
  
  if (error || !quota) {
    return null;
  }
  
  // Premium users see a special badge
  if (quota.tier === 'PREMIUM') {
    return (
      <motion.div 
        className="p-4 rounded-xl bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-900/30 dark:via-gray-800/50 dark:to-pink-900/20 border border-purple-200/60 dark:border-purple-700/40 shadow-sm shadow-purple-500/5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 rounded-xl shadow-md shadow-purple-500/30">
            <Crown size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold bg-gradient-to-r from-purple-700 to-pink-600 dark:from-purple-300 dark:to-pink-300 bg-clip-text text-transparent">
                {texts.premium}
              </span>
              <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-200/50 dark:border-emerald-700/30">
                ✓ {texts.active}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {texts.unlimited}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Free users see quota bar
  const isWarning = quota.percentage >= 80;
  const isCritical = quota.percentage >= 95;
  
  return (
    <motion.div 
      className={`p-3 rounded-lg ${
        isCritical 
          ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/10 border border-red-200 dark:border-red-800/50' 
          : isWarning 
            ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10 border border-orange-200 dark:border-orange-800/50'
            : 'bg-gradient-to-br from-gray-50 to-purple-50/30 dark:from-gray-800/50 dark:to-purple-900/10 border border-gray-200 dark:border-gray-700'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={12} className={`
            ${isCritical ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-gray-500'}
          `} />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {texts.clipsThisMonth}
          </span>
        </div>
        <span className={`text-xs font-bold ${
          isCritical ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-gray-900 dark:text-white'
        }`}>
          {quota.clips_used} / {quota.clips_limit}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-3 overflow-hidden">
        <motion.div 
          className={`h-full rounded-full ${
            isCritical 
              ? 'bg-gradient-to-r from-red-500 to-orange-500' 
              : isWarning 
                ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                : 'bg-gradient-to-r from-purple-500 to-blue-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(quota.percentage, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      
      {/* Warning Message */}
      {isWarning && (
        <div className={`flex items-center gap-2 mb-3 text-xs ${
          isCritical ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
        }`}>
          <span>{isCritical ? '🔥' : '⚠️'}</span>
          <span className="font-medium">
            {isCritical ? texts.limitAlmostReached : texts.quotaAlmostExhausted}
          </span>
        </div>
      )}
      
      {/* Upgrade CTA - Gradient réservé au marketing */}
      <button 
        onClick={handleUpgrade}
        className="
          w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg 
          bg-gradient-to-r from-purple-600 to-pink-600 
          hover:from-purple-700 hover:to-pink-700 
          text-white text-xs font-semibold 
          transition-all hover:shadow-lg hover:shadow-purple-500/25 
          active:scale-[0.98]
        "
      >
        <Zap size={12} className="text-amber-300" />
        <span>{texts.upgradeToPremium}</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded font-bold">{BETA_PRICING.PRICE}</span>
      </button>
    </motion.div>
  );
}

/**
 * Compact version for header/toolbar
 */
export function QuotaIndicatorCompact() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  
  useEffect(() => {
    async function fetchQuota() {
      try {
        const userId = backendApiService.getUserId();
        if (!userId) return;
        
        const data = await backendApiService.getCurrentQuota(userId);
        setQuota({
          tier: data.tier,
          clips_used: data.clips_used,
          clips_limit: data.clips_limit,
          percentage: data.percentage
        });
      } catch (err) {
        console.error('Failed to fetch quota:', err);
      }
    }
    fetchQuota();
  }, []);
  
  if (!quota) return null;
  
  if (quota.tier === 'PREMIUM') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <Crown size={12} className="text-yellow-500" />
        <span className="text-xs font-medium text-purple-600">Premium</span>
      </div>
    );
  }
  
  const isWarning = quota.percentage >= 80;
  
  return (
    <div className={`
      flex items-center gap-2 px-2 py-1 rounded-full
      ${isWarning 
        ? 'bg-gradient-to-r from-orange-500/10 to-red-500/10' 
        : 'bg-gray-100 dark:bg-gray-800'
      }
    `}>
      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${
            isWarning 
              ? 'bg-gradient-to-r from-orange-500 to-red-500' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500'
          }`}
          style={{ width: `${Math.min(quota.percentage, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${
        isWarning ? 'text-orange-600' : 'text-gray-600 dark:text-gray-400'
      }`}>
        {quota.clips_used}/{quota.clips_limit}
      </span>
    </div>
  );
}
