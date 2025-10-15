// packages/ui/src/components/workspace/UnifiedWorkspace-v3.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  ListChecks,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { ContentEditor } from '../editor/ContentEditor';
import { FileUploadConfig } from '../editor/FileUploadModal';
import { AttachedFile } from '../editor/FileCarousel';

export type WorkspaceTab = 'compose' | 'queue' | 'history';

export interface UnifiedWorkspaceProps {
  // Compose tab props
  content?: string;
  onContentChange?: (content: string) => void;
  selectedPage?: any;
  onSend?: () => Promise<void>;
  canSend?: boolean;
  
  // File upload props
  attachedFiles?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
  onFileUpload?: (config: FileUploadConfig) => Promise<void>;
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
      color: 'text-blue-600'
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
    <div className="flex flex-col h-full bg-white">
      {/* Barre d'onglets élégante */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-200 bg-gradient-to-b from-gray-50/50 to-white">
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
                  ? 'text-gray-900 bg-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                      : 'bg-blue-500'
                    }
                  `}
                >
                  {tab.badge}
                </motion.div>
              )}
              
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
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
                  <div className="p-6 text-center text-gray-500">
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
              className="h-full overflow-auto p-6"
            >
              <QueueView
                items={queueItems}
                onRetry={onRetryQueue}
                onRemove={onRemoveFromQueue}
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
              className="h-full overflow-auto p-6"
            >
              <HistoryView
                items={historyItems}
                onRetry={onRetryHistory}
                onDelete={onDeleteHistory}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Composants Queue et History (inchangés)
function QueueView({ items, onRetry, onRemove }: any) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ListChecks size={48} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun élément en attente
        </h3>
        <p className="text-sm text-gray-500">
          Les éléments que vous envoyez apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          File d'attente ({items.length})
        </h3>
      </div>

      {items.map((item: any) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div className="flex-shrink-0">
            {item.status === 'pending' && (
              <Loader2 size={20} className="text-blue-500 animate-spin" />
            )}
            {item.status === 'success' && (
              <CheckCircle size={20} className="text-green-500" />
            )}
            {item.status === 'failed' && (
              <AlertCircle size={20} className="text-red-500" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {item.title || 'Sans titre'}
            </p>
            <p className="text-xs text-gray-500">
              {item.status === 'pending' && 'En cours d\'envoi...'}
              {item.status === 'success' && 'Envoyé avec succès'}
              {item.status === 'failed' && 'Échec de l\'envoi'}
            </p>
          </div>

          {item.status === 'failed' && onRetry && (
            <button
              onClick={() => onRetry(item.id)}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Réessayer
            </button>
          )}

          {onRemove && (
            <button
              onClick={() => onRemove(item.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function HistoryView({ items, onRetry, onDelete }: any) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Clock size={48} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun historique
        </h3>
        <p className="text-sm text-gray-500">
          L'historique de vos envois apparaîtra ici
        </p>
      </div>
    );
  }

  const groupedByDate = items.reduce((acc: any, item: any) => {
    const date = new Date(item.createdAt || Date.now()).toLocaleDateString('fr-FR');
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, dateItems]: [string, any]) => (
        <div key={date}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {date}
          </h4>
          <div className="space-y-2">
            {dateItems.map((item: any) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex-shrink-0">
                  {item.status === 'success' ? (
                    <CheckCircle size={18} className="text-green-500" />
                  ) : (
                    <AlertCircle size={18} className="text-red-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title || 'Sans titre'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.createdAt || Date.now()).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {item.status === 'failed' && onRetry && (
                    <button
                      onClick={() => onRetry(item.id)}
                      className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      Réessayer
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}