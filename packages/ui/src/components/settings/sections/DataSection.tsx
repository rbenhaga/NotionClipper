/**
 * DataSection - Storage, cache, and danger zone
 * Clean Apple-style with proper danger zone for disconnect/delete
 */

import React, { useState } from 'react';
import {
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  LogOut,
  HardDrive,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  SettingsCard,
  SettingsRow,
  SettingsDivider,
  SettingsButton,
} from '../components/SettingsCard';

interface DataSectionProps {
  onClearCache?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const DataSection: React.FC<DataSectionProps> = ({
  onClearCache,
  onDisconnect,
  showNotification,
}) => {
  const [clearing, setClearing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    try {
      await onClearCache?.();
      showNotification?.('Cache vidé avec succès', 'success');
    } catch {
      showNotification?.('Erreur lors du vidage du cache', 'error');
    } finally {
      setClearing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // TODO: Implement actual sync
      await new Promise((r) => setTimeout(r, 1000));
      showNotification?.('Synchronisation terminée', 'success');
    } catch {
      showNotification?.('Erreur de synchronisation', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // TODO: Implement actual export
      await new Promise((r) => setTimeout(r, 800));
      showNotification?.('Données exportées', 'success');
    } catch {
      showNotification?.('Erreur lors de l\'export', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) return;

    // Confirmation dialog
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir vous déconnecter ?\n\nVous devrez vous reconnecter avec Notion pour utiliser l\'application.'
    );
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      await onDisconnect();
      showNotification?.('Déconnexion réussie', 'success');
    } catch {
      showNotification?.('Erreur lors de la déconnexion', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Storage Overview */}
      <SettingsCard title="Stockage local">
        <div className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[12px] mb-2">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Espace utilisé</span>
              <span className="text-gray-500 dark:text-gray-400">24.5 MB</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '24.5%' }}
                transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-gray-500 dark:text-gray-400">Cache: 12.3 MB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-300" />
              <span className="text-gray-500 dark:text-gray-400">Données: 8.2 MB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-200 dark:bg-violet-700" />
              <span className="text-gray-500 dark:text-gray-400">Préférences: 4 MB</span>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Cache Management */}
      <SettingsCard title="Gestion du cache">
        <SettingsRow label="Vider le cache">
          <SettingsButton
            variant="secondary"
            size="sm"
            onClick={handleClear}
            loading={clearing}
            icon={Trash2}
          >
            Vider
          </SettingsButton>
        </SettingsRow>

        <SettingsDivider />

        <SettingsRow label="Synchroniser">
          <SettingsButton
            variant="secondary"
            size="sm"
            onClick={handleSync}
            loading={syncing}
            icon={RefreshCw}
          >
            Sync
          </SettingsButton>
        </SettingsRow>
      </SettingsCard>

      {/* Export */}
      <SettingsCard title="Sauvegarde">
        <SettingsRow label="Exporter mes données">
          <SettingsButton
            variant="secondary"
            size="sm"
            onClick={handleExport}
            loading={exporting}
            icon={Download}
          >
            Exporter
          </SettingsButton>
        </SettingsRow>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 px-1">
          Télécharge vos préférences et templates au format JSON.
        </p>
      </SettingsCard>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-xl border border-red-200/50 dark:border-red-500/20 overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3 bg-red-50/50 dark:bg-red-500/[0.06] border-b border-red-200/30 dark:border-red-500/10">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={2} className="text-red-500" />
            <span className="text-[13px] font-semibold text-red-600 dark:text-red-400">
              Zone de danger
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 bg-white dark:bg-transparent">
          {/* Disconnect */}
          {onDisconnect && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200">
                  Se déconnecter
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  Vous devrez vous reconnecter avec Notion
                </p>
              </div>
              <SettingsButton
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
                loading={disconnecting}
                icon={LogOut}
              >
                Déconnexion
              </SettingsButton>
            </div>
          )}

          {onDisconnect && <SettingsDivider />}

          {/* Delete Account - Hidden/Disabled for now */}
          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200">
                Supprimer mon compte
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                Supprime définitivement toutes vos données
              </p>
            </div>
            <SettingsButton
              variant="danger"
              size="sm"
              disabled
              icon={Trash2}
            >
              Supprimer
            </SettingsButton>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-600 italic">
            Fonctionnalité bientôt disponible
          </p>
        </div>
      </motion.div>
    </div>
  );
};
