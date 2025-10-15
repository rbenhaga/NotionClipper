// packages/ui/src/components/panels/QueuePanel.tsx
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListChecks,
  Clock,
  Loader,
  AlertTriangle,
  CheckCircle,
  Trash2,
  X
} from 'lucide-react';
import type { QueueEntry, QueueStats } from '@notion-clipper/core-shared';
import { QueueCard } from '../queue/QueueCard';

interface QueuePanelProps {
  queue: QueueEntry[];
  stats: QueueStats;
  onClose: () => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  isOnline: boolean;
}

export function QueuePanel({
  queue,
  stats,
  onClose,
  onRetry,
  onRemove,
  onClear,
  isOnline
}: QueuePanelProps) {
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <ListChecks size={20} />
            {stats.queued > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                {stats.queued}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold">File d'attente</h3>
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-500">
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={onClear}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 size={14} />
              Vider
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 bg-gray-50 grid grid-cols-4 gap-2 text-xs border-b">
        <div className="text-center">
          <div className="text-gray-500">En attente</div>
          <div className="text-lg font-semibold text-blue-600">
            {stats.queued}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">En cours</div>
          <div className="text-lg font-semibold text-yellow-600">
            {stats.processing}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Retry</div>
          <div className="text-lg font-semibold text-orange-600">
            {stats.retrying}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Échoué</div>
          <div className="text-lg font-semibold text-red-600">
            {stats.failed}
          </div>
        </div>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg"
        >
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle size={16} />
            <div>
              <p className="text-sm font-medium">Mode hors ligne</p>
              <p className="text-xs text-orange-600">
                Les éléments seront traités à la reconnexion
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <ListChecks size={48} className="mb-4 opacity-50" />
            <p className="text-center">Aucun élément en attente</p>
            <p className="text-xs text-center mt-2">
              Les envois hors ligne apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <AnimatePresence>
              {queue.map((entry) => (
                <QueueCard
                  key={entry.id}
                  entry={entry}
                  onRetry={() => onRetry(entry.id)}
                  onRemove={() => onRemove(entry.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Processing Indicator */}
      {stats.processing > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center gap-2 text-blue-700">
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">
              Traitement de {stats.processing} élément{stats.processing > 1 ? 's' : ''}...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}