// packages/ui/src/components/history/HistoryView.tsx
import React from 'react';
import { History, RotateCcw, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';

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
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleReuse = (item: any) => {
    if (onContentChange && item.content) {
      // Remplir l'éditeur avec le contenu de l'historique
      onContentChange({
        text: item.content.raw || item.content.preview || '',
        type: item.content.type || 'text'
      });
      
      // Sélectionner la page si disponible
      if (onPageSelect && item.page && pages) {
        const page = pages.find(p => p.id === item.page.id);
        if (page) {
          onPageSelect(page);
        }
      }
      
      // Retourner à l'onglet compose
      if (setActiveTab) {
        setActiveTab('compose');
      }
    }
  };

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8">
        <History size={64} className="mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium mb-2">Aucun historique</h3>
        <p className="text-sm text-center">
          Vos envois vers Notion apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Historique</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {items.length} élément{items.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div 
              key={item.id || index} 
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(item.status)}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.page?.title || 'Page inconnue'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                    {item.content?.preview || item.content?.raw || 'Contenu non disponible'}
                  </p>
                  
                  {item.content?.filesCount > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                        {item.content.filesCount} fichier{item.content.filesCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleReuse(item)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Réutiliser ce contenu"
                  >
                    <RotateCcw size={16} />
                  </button>
                  
                  {item.status === 'failed' && (
                    <button
                      onClick={() => onRetry(item)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      title="Réessayer l'envoi"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}