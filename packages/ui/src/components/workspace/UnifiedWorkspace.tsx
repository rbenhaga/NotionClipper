// packages/ui/src/components/workspace/UnifiedWorkspace.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { HistoryView } from '../history/HistoryView';
import { QueueView } from '../queue/QueueView';

export type WorkspaceTab = 'compose' | 'queue' | 'history';

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

  // Queue tab props
  queueItems?: any[];
  onRetryQueue?: (id: string) => void;
  onRemoveFromQueue?: (id: string) => void;

  // History tab props
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
  queueItems = [],
  onRetryQueue,
  onRemoveFromQueue,
  historyItems = [],
  onRetryHistory,
  onDeleteHistory,
  customEditor,
  children
}: UnifiedWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('compose');
  const [sending, setSending] = useState(false);

  // Statistiques
  const pendingQueue = queueItems.filter(item => item.status === 'pending').length;
  const failedQueue = queueItems.filter(item => item.status === 'failed').length;

  const tabs = [
    {
      id: 'compose' as WorkspaceTab,
      label: 'Composer',
      icon: FileText,
      badge: null,
      color: 'text-gray-600'
    },
    {
      id: 'queue' as WorkspaceTab,
      label: 'File d\'attente',
      icon: ListChecks,
      badge: pendingQueue > 0 ? pendingQueue : null,
      color: failedQueue > 0 ? 'text-orange-600' : 'text-gray-600'
    },
    {
      id: 'history' as WorkspaceTab,
      label: 'Historique',
      icon: Clock,
      badge: null,
      color: 'text-gray-600'
    }
  ];

  const handleSend = async () => {
    if (!canSend || !onSend) return;

    setSending(true);
    try {
      await onSend();
      setActiveTab('queue');
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fafafa] dark:bg-[#191919]">
      {/* Barre d'onglets élégante */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-200 dark:border-[#373737] bg-white dark:bg-[#191919]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-lg
                transition-all duration-200 font-medium text-sm
                ${isActive
                  ? 'text-gray-900 dark:text-white bg-white dark:bg-[#202020] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={16} className={isActive ? tab.color : ''} />
              <span>{tab.label}</span>

              {tab.badge && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`
                    flex items-center justify-center
                    min-w-[20px] h-5 px-1.5 rounded-full
                    text-xs font-semibold text-white
                    ${failedQueue > 0 && tab.id === 'queue'
                      ? 'bg-orange-500'
                      : 'bg-gray-600'
                    }
                  `}
                >
                  {tab.badge}
                </motion.div>
              )}

              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700 dark:bg-gray-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Contenu des onglets */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'compose' && (
            <motion.div
              key="compose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              {/* Contenu principal */}
              <div className="flex-1 overflow-auto">
                {children || customEditor || (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    Passez un ContentEditor en children pour afficher le contenu
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'queue' && (
            <motion.div
              key="queue"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-auto p-6 custom-scrollbar"
            >
              <QueueView
                items={queueItems}
                onRetry={onRetryQueue || (() => { })}
                onDelete={onRemoveFromQueue || (() => { })}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-auto p-6 custom-scrollbar"
            >
              <HistoryView
                items={historyItems}
                onRetry={onRetryHistory || (() => { })}
                onDelete={onDeleteHistory || (() => { })}
                onContentChange={onContentChange}
                onPageSelect={onPageSelect}
                pages={pages}
                setActiveTab={(tab: string) => setActiveTab(tab as WorkspaceTab)}
                showQueueItems={true}
                queueItems={queueItems}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
