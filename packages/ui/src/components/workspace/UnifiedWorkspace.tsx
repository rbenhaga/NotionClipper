// packages/ui/src/components/workspace/UnifiedWorkspace.tsx
import React, { useState } from 'react';
import { useTranslation } from '@notion-clipper/i18n';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionButton } from '../common/MotionWrapper';
import {
  Clock,
  ListChecks,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  RotateCw,
  Trash2,
  Copy
} from 'lucide-react';
import { UnifiedQueueHistory } from '../unified/UnifiedQueueHistory';

export type WorkspaceTab = 'compose' | 'activity';

export interface UnifiedWorkspaceProps {
  // Compose tab props
  content?: string;
  onContentChange?: (content: string) => void;
  selectedPage?: any;
  onPageSelect?: (page: any) => void;
  pages?: any[];
  onSend?: () => Promise<void>;
  canSend?: boolean;

  // File upload props
  attachedFiles?: any[];
  onFilesChange?: (files: any[]) => void;
  onFileUpload?: (config: any) => Promise<void>;
  maxFileSize?: number;
  allowedFileTypes?: string[];

  // 🆕 Unified queue/history props
  unifiedEntries?: any[];
  onRetryEntry?: (id: string) => void;
  onDeleteEntry?: (id: string) => void;
  onClearAll?: () => void;
  isOnline?: boolean;

  // Legacy props (deprecated)
  queueItems?: any[];
  onRetryQueue?: (id: string) => void;
  onRemoveFromQueue?: (id: string) => void;
  historyItems?: any[];
  onRetryHistory?: (id: string) => void;
  onDeleteHistory?: (id: string) => void;

  // Custom editor
  customEditor?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Unified Workspace v3 - Design élégant style Notion/Apple
 * Avec ContentEditorWithAttachments intégré
 */
export function UnifiedWorkspace({
  content = '',
  onContentChange,
  selectedPage,
  onPageSelect,
  pages = [],
  onSend,
  canSend = false,
  attachedFiles = [],
  onFilesChange,
  onFileUpload,
  maxFileSize = 20 * 1024 * 1024,
  allowedFileTypes = [],
  // 🆕 Unified props
  unifiedEntries = [],
  onRetryEntry,
  onDeleteEntry,
  onClearAll,
  isOnline = true,
  // Legacy props (fallback)
  queueItems = [],
  onRetryQueue,
  onRemoveFromQueue,
  historyItems = [],
  onRetryHistory,
  onDeleteHistory,
  customEditor,
  children
}: UnifiedWorkspaceProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('compose');
  const [sending, setSending] = useState(false);

  // 🆕 Statistiques unifiées
  const pendingCount = unifiedEntries.filter(e => e.status === 'pending' || e.status === 'offline').length;
  const errorCount = unifiedEntries.filter(e => e.status === 'error').length;
  const totalActivity = unifiedEntries.length;

  // Fallback vers les anciennes props si les nouvelles ne sont pas disponibles
  const legacyPendingQueue = queueItems.filter(item => item.status === 'pending').length;
  const legacyFailedQueue = queueItems.filter(item => item.status === 'failed').length;

  const finalPendingCount = totalActivity > 0 ? pendingCount : legacyPendingQueue;
  const finalErrorCount = totalActivity > 0 ? errorCount : legacyFailedQueue;

  const tabs = [
    {
      id: 'compose' as WorkspaceTab,
      label: t('common.compose'),
      icon: FileText,
      badge: null,
      color: 'text-gray-600'
    },
    {
      id: 'activity' as WorkspaceTab,
      label: t('common.activity'),
      icon: ListChecks,
      badge: finalPendingCount > 0 ? finalPendingCount : null,
      color: finalErrorCount > 0 ? 'text-orange-600' : finalPendingCount > 0 ? 'text-blue-600' : 'text-gray-600'
    }
  ];

  const handleSend = async () => {
    // 🔒 SECURITY: Prevent spam clicks
    if (!canSend || !onSend || sending) return;

    setSending(true);
    try {
      await onSend();
      setActiveTab('activity'); // 🆕 Rediriger vers l'onglet activité unifié
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#fafafa] to-white dark:from-[#191919] dark:to-[#1a1a1f]">
      {/* Barre d'onglets élégante avec accent violet */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#191919]/80 backdrop-blur-sm relative workspace-tabs">
        
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <MotionButton
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-lg
                transition-all duration-200 font-medium text-sm
                ${isActive
                  ? 'text-purple-700 dark:text-purple-300 bg-gradient-to-r from-purple-50 to-pink-50/50 dark:from-purple-900/30 dark:to-pink-900/20 border border-purple-200/50 dark:border-purple-700/30 shadow-sm shadow-purple-500/5'
                  : 'text-gray-600 dark:text-gray-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 border border-transparent hover:border-purple-200/30 dark:hover:border-purple-700/20'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={16} className={isActive ? 'text-purple-600 dark:text-purple-400' : ''} />
              <span>{tab.label}</span>

              {tab.badge && (
                <MotionDiv
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`
                    flex items-center justify-center
                    min-w-[20px] h-5 px-1.5 rounded-full
                    text-xs font-semibold text-white
                    ${finalErrorCount > 0 && tab.id === 'activity'
                      ? 'bg-orange-500'
                      : 'bg-purple-500'
                    }
                  `}
                >
                  {tab.badge}
                </MotionDiv>
              )}

              {isActive && (
                <MotionDiv
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 dark:bg-purple-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </MotionButton>
          );
        })}
      </div>

      {/* Contenu des onglets */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'compose' && (
            <MotionDiv
              key="compose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              {/* Contenu principal */}
              <div className="flex-1 overflow-y-auto notion-scrollbar">
                {children || customEditor || (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    Passez un ContentEditor en children pour afficher le contenu
                  </div>
                )}
              </div>
            </MotionDiv>
          )}

          {activeTab === 'activity' && (
            <MotionDiv
              key="activity"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-auto p-6 notion-scrollbar"
            >
              {/* 🆕 Composant unifié pour queue et historique */}
              <UnifiedQueueHistory
                  entries={unifiedEntries}
                  onRetry={onRetryEntry || (() => {})}
                  onDelete={onDeleteEntry || (() => {})}
                  onClear={onClearAll}
                  isOnline={isOnline}
                />
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}