// packages/ui/src/components/history/HistoryView.tsx
// ✅ CORRECTION: Support du statut 'pending' pour les éléments hors ligne
import React from 'react';
import { History, RotateCcw, Trash2, Clock, CheckCircle2, AlertCircle, Sparkles, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export interface HistoryViewProps {
  items: any[];
  onRetry: (entry: any) => void;
  onDelete: (id: string) => void;
  onContentChange?: (content: any) => void;
  onPageSelect?: (page: any) => void;
  pages?: any[];
  setActiveTab?: (tab: string) => void;
  isOnline?: boolean; // ✅ NOUVEAU: état de connexion
  showQueueItems?: boolean; // 🆕 Afficher aussi les éléments de la queue
  queueItems?: any[]; // 🆕 Éléments de la queue
}

export function HistoryView({ 
  items, 
  onRetry, 
  onDelete, 
  onContentChange,
  onPageSelect,
  pages,
  setActiveTab,
  isOnline = true, // ✅ NOUVEAU: par défaut en ligne
  showQueueItems = true, // 🆕 Par défaut, afficher les éléments de la queue
  queueItems = [] // 🆕 Items from queue
}: HistoryViewProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-4 h-4" strokeWidth={2} />,
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
          borderColor: 'border-emerald-200 dark:border-emerald-500/30'
        };
      case 'error':
      case 'failed':
        return {
          icon: <AlertCircle className="w-4 h-4" strokeWidth={2} />,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-500/10',
          borderColor: 'border-red-200 dark:border-red-500/30'
        };
      case 'pending': // ✅ NOUVEAU: statut pending
        return {
          icon: <Clock className="w-4 h-4 animate-pulse" strokeWidth={2} />,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-500/10',
          borderColor: 'border-amber-200 dark:border-amber-500/30'
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" strokeWidth={2} />,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-500/10',
          borderColor: 'border-gray-200 dark:border-gray-500/30'
        };
    }
  };

  const handleReuse = (item: any) => {
    if (onContentChange && item.content) {
      onContentChange({
        text: item.content.raw || item.content.preview || '',
        type: item.content.type || 'text'
      });
      
      if (onPageSelect && item.page && pages) {
        const page = pages.find(p => p.id === item.page.id);
        if (page) {
          onPageSelect(page);
        }
      }
      
      if (setActiveTab) {
        setActiveTab('compose');
      }
    }
  };

  // 🆕 Combiner queue et historique
  const allItems = React.useMemo(() => {
    if (!showQueueItems) return items;

    // Créer une Map des IDs d'historique qui sont liés à des éléments de queue
    const queueHistoryIds = new Set(queueItems.map(q => q.historyId).filter(Boolean));

    // Filtrer l'historique pour ne garder que les éléments qui ne sont PAS dans la queue
    const historyOnly = items.filter(item => !queueHistoryIds.has(item.id));

    // Convertir les éléments de la queue en format d'historique pour l'affichage
    const queueAsHistory = queueItems.map(qItem => ({
      id: qItem.historyId || qItem.id,
      timestamp: qItem.createdAt || Date.now(),
      status: qItem.status === 'queued' || qItem.status === 'retrying' ? 'pending' : qItem.status === 'processing' ? 'sending' : qItem.status === 'completed' ? 'success' : qItem.status === 'failed' ? 'failed' : 'pending',
      content: {
        raw: qItem.payload?.content || '',
        preview: qItem.payload?.content?.substring(0, 200) || 'En attente...',
        type: 'text'
      },
      page: {
        id: qItem.payload?.pageId || '',
        title: qItem.page?.title || 'Page inconnue',
        icon: qItem.page?.icon || '⏳'
      },
      retryCount: qItem.attempts || 0,
      isQueued: true, // 🆕 Flag pour identifier les éléments de la queue
      queuePriority: qItem.priority,
      nextRetry: qItem.nextRetry,
      error: qItem.error
    }));

    // Combiner et trier par timestamp (plus récent en premier)
    const combined = [...queueAsHistory, ...historyOnly].sort((a, b) =>
      (b.timestamp || 0) - (a.timestamp || 0)
    );

    return combined;
  }, [items, queueItems, showQueueItems]);

  // ✅ Séparer les éléments pending et terminés
  const pendingItems = allItems.filter(item => item.status === 'pending');
  const completedItems = allItems.filter(item => item.status !== 'pending');

  // Empty state
  if (allItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 py-16">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 mx-auto">
            <History className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aucun historique
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Vos envois vers Notion apparaîtront ici
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-4 space-y-3">
        {/* ✅ Section File d'attente (si des éléments pending) */}
        {pendingItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi size={16} className="text-green-500" />
                ) : (
                  <WifiOff size={16} className="text-red-500" />
                )}
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  File d'attente ({pendingItems.length})
                </h3>
              </div>
              {!isOnline && (
                <span className="text-xs text-red-600 dark:text-red-400">Hors ligne</span>
              )}
            </div>
            <div className="space-y-2">
              {pendingItems.map((item, index) => {
                const status = getStatusConfig(item.status);
                const date = new Date(item.timestamp || Date.now());
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      p-4 rounded-xl border ${status.borderColor} ${status.bgColor}
                      hover:shadow-md transition-all duration-200
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`${status.color}`}>
                            {status.icon}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {item.page?.title || 'Page inconnue'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                          {item.content?.preview || 'Contenu'}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{date.toLocaleString('fr-FR')}</span>
                          <span className="text-amber-600 dark:text-amber-400">• En attente d'envoi</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {isOnline && (
                          <button
                            onClick={() => onRetry(item)}
                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                            title="Réessayer maintenant"
                          >
                            <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ✅ Section Historique (éléments terminés) */}
        {completedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 px-2">
              Historique ({completedItems.length})
            </h3>
            <div className="space-y-2">
              {completedItems.map((item, index) => {
                const status = getStatusConfig(item.status);
                const date = new Date(item.timestamp || Date.now());
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (index + pendingItems.length) * 0.05 }}
                    className={`
                      p-4 rounded-xl border ${status.borderColor} ${status.bgColor}
                      hover:shadow-md transition-all duration-200
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`${status.color}`}>
                            {status.icon}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {item.page?.title || 'Page inconnue'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                          {item.content?.preview || 'Contenu'}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{date.toLocaleString('fr-FR')}</span>
                        </div>

                        {item.error && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                            Erreur: {item.error}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleReuse(item)}
                          className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                          title="Réutiliser"
                        >
                          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        
                        {item.status === 'failed' && (
                          <button
                            onClick={() => onRetry(item)}
                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                            title="Réessayer"
                          >
                            <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}