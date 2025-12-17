/**
 * ConnectionsSection - Connexions avec accent violet
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { authDataManager } from '../../../services/AuthDataManager';
import { SettingsCard, SettingsButton, SettingsBadge } from '../components/SettingsCard';

interface ConnectionsSectionProps {
  config: { notionToken?: string; [key: string]: any };
  onDisconnect?: () => Promise<void>;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ConnectionsSection: React.FC<ConnectionsSectionProps> = ({
  config,
  onDisconnect,
  showNotification
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authData, setAuthData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await authDataManager.loadAuthData(true);
        setAuthData(data);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const isConnected = !!(config.notionToken || authData?.notionToken || authData?.notionWorkspace?.id);
  const workspaceName = authData?.notionWorkspace?.name || 'Workspace';

  const handleDisconnect = async () => {
    if (!confirm('Déconnecter ce workspace ?')) return;
    setIsDisconnecting(true);
    try {
      await onDisconnect?.();
      showNotification?.('Déconnecté', 'success');
    } catch { showNotification?.('Erreur', 'error'); }
    finally { setIsDisconnecting(false); }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      showNotification?.('Actualisé', 'success');
    } catch { showNotification?.('Erreur', 'error'); }
    finally { setIsRefreshing(false); }
  };

  return (
    <div className="space-y-4 max-w-lg">
      {/* Notion */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          p-4 rounded-xl border transition-colors
          ${isConnected 
            ? 'bg-emerald-500/[0.04] border-emerald-500/15' 
            : 'bg-gray-50/80 dark:bg-white/[0.02] border-gray-200/50 dark:border-white/[0.04]'
          }
        `}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-white/[0.06] flex items-center justify-center shadow-sm border border-gray-200/50 dark:border-white/[0.06]">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
              alt="Notion"
              className="w-6 h-6 object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] font-medium text-gray-800 dark:text-gray-100">Notion</span>
              {isConnected && <SettingsBadge variant="success">Connecté</SettingsBadge>}
            </div>
            {isConnected ? (
              <>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-3">{workspaceName}</p>
                <div className="flex gap-2">
                  <SettingsButton 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleRefresh} 
                    loading={isRefreshing}
                    icon={RefreshCw}
                  >
                    Actualiser
                  </SettingsButton>
                  <SettingsButton 
                    variant="danger" 
                    size="sm" 
                    onClick={handleDisconnect} 
                    loading={isDisconnecting}
                    icon={Trash2}
                  >
                    Déconnecter
                  </SettingsButton>
                </div>
              </>
            ) : (
              <>
                <p className="text-[12px] text-gray-400 dark:text-gray-500 mb-3">Non connecté</p>
                <SettingsButton variant="primary" size="sm">Connecter</SettingsButton>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {isConnected && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Pages', value: '∞' },
            { label: 'Sync', value: 'OK' },
            { label: 'Statut', value: 'Actif' },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-lg bg-gray-50/80 dark:bg-white/[0.02] border border-gray-200/30 dark:border-white/[0.04] text-center">
              <p className="text-[14px] font-medium text-gray-700 dark:text-gray-200">{stat.value}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Help */}
      <a
        href="#"
        className="flex items-center justify-between p-3 rounded-lg bg-violet-500/[0.03] dark:bg-violet-400/[0.03] border border-violet-500/10 hover:bg-violet-500/[0.06] dark:hover:bg-violet-400/[0.06] transition-colors group"
      >
        <span className="text-[12px] text-violet-700 dark:text-violet-300">Guide de connexion</span>
        <ExternalLink size={12} className="text-violet-400 group-hover:text-violet-500 transition-colors" />
      </a>
    </div>
  );
};
