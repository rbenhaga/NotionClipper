// packages/ui/src/components/history/HistoryView.tsx
// Design Notion/Apple moderne et élégant

import React from 'react';
import { History, RotateCcw, Trash2, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export interface HistoryViewProps {
  items: any[];
  onRetry: (entry: any) => void;
  onDelete: (id: string) => void;
  onContentChange?: (content: any) => void;
  onPageSelect?: (page: any) => void;
  pages?: any[];
  setActiveTab?: (tab: string) => void;
}

export function HistoryView({ 
  items, 
  onRetry, 
  onDelete, 
  onContentChange,
  onPageSelect,
  pages,
  setActiveTab 
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
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4" strokeWidth={2} />,
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

  // Empty state
  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-sm"
        >
          {/* Icône avec gradient */}
          <div className="relative mb-6 inline-block">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center shadow-sm">
              <History className="w-9 h-9 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-br from-gray-200/50 to-transparent dark:from-gray-700/30 rounded-2xl blur-xl -z-10" />
          </div>

          <h3 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Aucun historique
          </h3>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Vos envois vers Notion apparaîtront ici.<br />
            Commencez par capturer du contenu.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
              Historique
            </h2>
            
            {/* Badge de count */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                {items.length}
              </span>
              <span className="text-[12px] text-gray-500 dark:text-gray-400">
                élément{items.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            Tous vos envois récents vers Notion
          </p>
        </div>

        {/* Liste des items */}
        <div className="space-y-3">
          {items.map((item, index) => {
            const statusConfig = getStatusConfig(item.status);
            
            return (
              <motion.div
                key={item.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
                className="
                  group relative
                  bg-white dark:bg-gray-800/50
                  border border-gray-200 dark:border-gray-700
                  rounded-xl
                  hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20
                  transition-all duration-200
                "
              >
                <div className="p-4">
                  {/* Header avec status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      {/* Page title */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`
                          flex items-center gap-1.5 px-2 py-1
                          ${statusConfig.bgColor}
                          rounded-lg
                        `}>
                          <span className={statusConfig.color}>
                            {statusConfig.icon}
                          </span>
                        </div>
                        
                        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {item.page?.title || 'Page inconnue'}
                        </h3>
                      </div>
                      
                      {/* Timestamp */}
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">
                        {new Date(item.timestamp).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Content preview */}
                  <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 mb-3">
                    {item.content?.preview || item.content?.raw || 'Contenu non disponible'}
                  </p>
                  
                  {/* Files badge */}
                  {item.content?.filesCount > 0 && (
                    <div className="mb-3">
                      <span className="
                        inline-flex items-center gap-1.5 px-2.5 py-1
                        text-[11px] font-semibold
                        bg-blue-50 dark:bg-blue-500/10
                        text-blue-700 dark:text-blue-300
                        border border-blue-200 dark:border-blue-500/30
                        rounded-lg
                      ">
                        <Sparkles className="w-3 h-3" strokeWidth={2} />
                        {item.content.filesCount} fichier{item.content.filesCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    {/* Bouton Réutiliser */}
                    <button
                      onClick={() => handleReuse(item)}
                      className="
                        group/btn
                        flex items-center gap-1.5 px-3 py-1.5
                        text-[12px] font-medium
                        text-blue-600 dark:text-blue-400
                        hover:bg-blue-50 dark:hover:bg-blue-500/10
                        rounded-lg
                        transition-all duration-200
                      "
                      title="Réutiliser ce contenu"
                    >
                      <RotateCcw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-300" strokeWidth={2} />
                      <span>Réutiliser</span>
                    </button>
                    
                    {/* Bouton Réessayer (si failed) */}
                    {item.status === 'failed' && (
                      <button
                        onClick={() => onRetry(item)}
                        className="
                          flex items-center gap-1.5 px-3 py-1.5
                          text-[12px] font-medium
                          text-white
                          bg-gradient-to-r from-emerald-600 to-emerald-500
                          hover:from-emerald-700 hover:to-emerald-600
                          rounded-lg
                          shadow-sm
                          transition-all duration-200
                        "
                        title="Réessayer l'envoi"
                      >
                        <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Réessayer</span>
                      </button>
                    )}
                    
                    {/* Bouton Supprimer */}
                    <button
                      onClick={() => onDelete(item.id)}
                      className="
                        ml-auto
                        flex items-center gap-1.5 px-3 py-1.5
                        text-[12px] font-medium
                        text-red-600 dark:text-red-400
                        hover:bg-red-50 dark:hover:bg-red-500/10
                        rounded-lg
                        transition-all duration-200
                      "
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}