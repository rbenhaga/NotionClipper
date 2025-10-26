// packages/ui/src/components/queue/QueueView.tsx
import React from 'react';
import { Clock, RotateCcw, Trash2, Wifi, WifiOff, AlertCircle } from 'lucide-react';

export interface QueueViewProps {
  items: any[];
  onRetry: (entry: any) => void;
  onDelete: (id: string) => void;
}

export function QueueView({ items, onRetry, onDelete }: QueueViewProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'normal':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'low':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Haute';
      case 'normal':
        return 'Normale';
      case 'low':
        return 'Basse';
      default:
        return 'Normale';
    }
  };

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8">
        <Clock size={64} className="mb-4 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-medium mb-2">File d'attente vide</h3>
        <p className="text-sm text-center">
          Les éléments en attente d'envoi apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">File d'attente</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {items.length} élément{items.length > 1 ? 's' : ''} en attente
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Wifi size={16} className="text-green-500" />
              <span>En ligne</span>
            </div>
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
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.page?.title || 'Page inconnue'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(item.priority)}`}>
                      {getPriorityLabel(item.priority)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                    {item.content?.preview || item.content || 'Contenu en attente...'}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Ajouté le {new Date(item.timestamp || Date.now()).toLocaleString()}</span>
                    {item.retryCount > 0 && (
                      <span className="flex items-center gap-1">
                        <AlertCircle size={12} />
                        {item.retryCount} tentative{item.retryCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => onRetry(item)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    title="Traiter maintenant"
                  >
                    <RotateCcw size={16} />
                  </button>
                  
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Supprimer de la file"
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