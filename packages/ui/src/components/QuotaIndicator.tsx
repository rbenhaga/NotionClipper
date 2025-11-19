import React, { useEffect, useState } from 'react';
import { backendApiService } from '@notion-clipper/core-shared';

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
  
  useEffect(() => {
    fetchQuota();
    
    // Rafraîchir toutes les 5 minutes
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
    // Émettre un événement pour ouvrir le modal d'upgrade
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.send('open-upgrade-modal');
    }
  }
  
  if (loading) {
    return (
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }
  
  if (error || !quota) {
    return null; // Ne rien afficher en cas d'erreur
  }
  
  // Premium users don't see quota
  if (quota.tier === 'PREMIUM') {
    return (
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
            Premium
          </span>
        </div>
      </div>
    );
  }
  
  // Free users see quota bar
  const isWarning = quota.percentage >= 80;
  const isCritical = quota.percentage >= 95;
  
  return (
    <div className={`px-4 py-3 rounded-lg border ${
      isCritical 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
        : isWarning 
        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Clips this month
        </span>
        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
          {quota.clips_used} / {quota.clips_limit}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div 
          className={`h-full transition-all duration-300 ${
            isCritical 
              ? 'bg-red-500' 
              : isWarning 
              ? 'bg-orange-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(quota.percentage, 100)}%` }}
        />
      </div>
      
      {/* Warning Message */}
      {isWarning && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">⚠️</span>
          <span className={`text-xs font-medium ${
            isCritical 
              ? 'text-red-700 dark:text-red-300' 
              : 'text-orange-700 dark:text-orange-300'
          }`}>
            {isCritical ? 'Almost out of clips!' : 'Running low on clips'}
          </span>
        </div>
      )}
      
      {/* Upgrade Button */}
      {isWarning && (
        <button 
          onClick={handleUpgrade}
          className="w-full px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        >
          Upgrade to Premium
        </button>
      )}
    </div>
  );
}
